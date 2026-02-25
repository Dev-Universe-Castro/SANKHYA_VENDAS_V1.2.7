import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { accessControlService } from '@/lib/access-control-service';
import { sankhyaDynamicAPI } from '@/lib/sankhya-dynamic-api';
import { oracleService } from '@/lib/oracle-db';
import fs from 'fs';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const userCookie = cookieStore.get('user');

    if (!userCookie) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const authUser = JSON.parse(userCookie.value);
    const idEmpresa = authUser.ID_EMPRESA || authUser.idEmpresa || 1;
    const codUsuario = authUser.CODUSUARIO || authUser.id || authUser.codUsuario;

    if (!codUsuario) {
      console.error('❌ [DASHBOARD] codUsuario não encontrado no cookie:', authUser);
      return NextResponse.json({ error: 'Usuário inválido' }, { status: 400 });
    }

    const searchParams = request.nextUrl.searchParams;
    const diasParam = searchParams.get('dias') || '30';
    const dias = parseInt(diasParam, 10);

    console.log(`🔍 [DASHBOARD] Buscando KPIs para Dashboard do Usuário ${codUsuario} nos últimos ${dias} dias`);

    // Obter permissões completas do usuário
    const userAccess = await accessControlService.getFullUserAccess(codUsuario, idEmpresa);

    // Definir data de corte
    const dataFim = new Date();
    const dataInicio = new Date();
    dataInicio.setDate(dataInicio.getDate() - dias);

    // 1. DADOS DE CABEÇALHO (SANKHYA API)
    const formatDate = (d: Date) => {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    };

    const dataInicioStr = formatDate(dataInicio);
    const dataFimStr = formatDate(dataFim);

    // Adicionando filtro de Pedidos baseado na regra de acesso
    let expressionCabecalho = `TIPMOV = 'V' AND DTNEG >= '${dataInicioStr}' AND DTNEG <= '${dataFimStr}'`;

    if (!userAccess.isAdmin && userAccess.data.acessoClientes !== 'TODOS') {
      if (userAccess.data.acessoClientes === 'MANUAL') {
        if (userAccess.clientesManuais && userAccess.clientesManuais.length > 0) {
          expressionCabecalho += ` AND CODPARC IN (${userAccess.clientesManuais.join(',')})`;
        } else {
          expressionCabecalho += ` AND 1 = 0`; // No clients available
        }
      } else if (userAccess.data.acessoClientes === 'EQUIPE') {
        const vendedores = [userAccess.codVendedor, ...userAccess.vendedoresEquipe].filter(Boolean);
        if (vendedores.length > 0) {
          expressionCabecalho += ` AND Parceiro.CODVEND IN (${vendedores.join(',')})`;
        } else {
          expressionCabecalho += ` AND 1 = 0`;
        }
      } else { // VINCULADO
        if (userAccess.codVendedor) {
          expressionCabecalho += ` AND Parceiro.CODVEND = ${userAccess.codVendedor}`;
        } else {
          expressionCabecalho += ` AND 1 = 0`;
        }
      }
    }

    const payloadCabecalho = {
      serviceName: 'CRUDServiceProvider.loadRecords',
      requestBody: {
        dataSet: {
          rootEntity: 'CabecalhoNota',
          includePresentationFields: 'N',
          offsetPage: null,
          disableRowsLimit: true,
          entity: {
            fieldset: {
              list: 'NUNOTA,DTNEG,CODPARC,VLRNOTA,TIPMOV'
            }
          },
          criteria: {
            expression: {
              $: expressionCabecalho
            }
          }
        }
      }
    };

    const responseCab = await sankhyaDynamicAPI.fazerRequisicao(
      idEmpresa,
      '/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json',
      'POST',
      payloadCabecalho
    );

    const entitiesCab = responseCab?.responseBody?.entities;
    let cabecalhos: any[] = [];

    if (entitiesCab?.entity) {
      const fieldNames = entitiesCab.metadata?.fields?.field?.map((f: any) => f.name) || [];
      const entityArray = Array.isArray(entitiesCab.entity) ? entitiesCab.entity : [entitiesCab.entity];

      cabecalhos = entityArray.map((rawEntity: any) => {
        const cleanObject: any = {};
        for (let i = 0; i < fieldNames.length; i++) {
          const fieldKey = `f${i}`;
          const fieldName = fieldNames[i];
          if (rawEntity[fieldKey]?.$) {
            cleanObject[fieldName] = rawEntity[fieldKey].$;
          }
        }
        return cleanObject;
      });
    }

    // Processamento de KPIs Locais
    let totalFaturamento = 0;
    const vendasPorDia: Record<string, number> = {};
    const vendasPorCliente: Record<string, { nome: string, valor: number, qtd: number }> = {};
    const nunotasValidos: number[] = [];

    // Não limitar a 500 notas, processar todas do período selecionado
    const limitCabecalhos = cabecalhos;

    limitCabecalhos.forEach((cab: any) => {
      const vlr = parseFloat(cab.VLRNOTA) || 0;
      totalFaturamento += vlr;
      nunotasValidos.push(cab.NUNOTA);

      // Formatar DTNEG vinda do XML (DD/MM/YYYY) para sort/charts
      let dataStr = cab.DTNEG;
      if (dataStr && dataStr.includes('/')) {
        const [d, m, y] = dataStr.split('/');
        dataStr = `${y}-${m}-${d}`;
      }

      if (!vendasPorDia[dataStr]) vendasPorDia[dataStr] = 0;
      vendasPorDia[dataStr] += vlr;

      const codParc = cab.CODPARC;
      if (!vendasPorCliente[codParc]) {
        vendasPorCliente[codParc] = { nome: `Parceiro ${codParc}`, valor: 0, qtd: 0 };
      }
      vendasPorCliente[codParc].valor += vlr;
      vendasPorCliente[codParc].qtd += 1;
    });

    const totalPedidos = limitCabecalhos.length;
    const ticketMedio = totalPedidos > 0 ? totalFaturamento / totalPedidos : 0;

    // Transformar agrupamentos em Arrays
    const chartFaturamento = Object.entries(vendasPorDia)
      .map(([data, valor]) => ({ data, valor }))
      .sort((a, b) => a.data.localeCompare(b.data));

    const topClientes = Object.values(vendasPorCliente)
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5);

    // Buscar nomes dos parceiros top
    const topCodPartners = Object.keys(vendasPorCliente)
      .map(Number)
      .filter(n => n > 0);

    if (topCodPartners.length > 0) {
      try {
        const placeholders = topCodPartners.map((_, i) => `:cod${i}`).join(',');
        const binds: any = {};
        topCodPartners.forEach((cod, i) => { binds[`cod${i}`] = cod; });
        const sqlParc = `SELECT CODPARC, NOMEPARC FROM AS_PARCEIROS WHERE CODPARC IN (${placeholders})`;
        const parceiros = await oracleService.executeQuery(sqlParc, binds);

        topClientes.forEach(cli => {
          const cod = Object.keys(vendasPorCliente).find(k => vendasPorCliente[k].nome === cli.nome);
          if (cod) {
            const p = parceiros.find((dbP: any) => String(dbP.CODPARC) === cod);
            if (p) cli.nome = p.NOMEPARC || `Parceiro ${cod}`;
          }
        });
      } catch (e: any) {
        console.log('Erro ao buscar Nomes de Parceiros', e.message);
      }
    }

    // 2. BUSCA DE ITENS DINÂMICA (SANKHYA API) - GIRO DE PRODUTOS
    let topProdutos: any[] = [];

    // Buscar itens apenas se houverem notas válidas. Limite em notas recentes para não estourar a API caso sejam muitas.
    if (nunotasValidos.length > 0) {
      // Limitar a buscar até 999 itens (limite do Oracle IN clause) para evitar quebra da query no ERP
      const batchNunotas = nunotasValidos.slice(0, 999);
      const nunotaList = batchNunotas.join(',');

      try {
        let expressionItem = `NUNOTA IN (${nunotaList})`;

        if (!userAccess.isAdmin && userAccess.data.acessoProdutos !== 'TODOS') {
          if (userAccess.data.acessoProdutos === 'MANUAL') {
            if (userAccess.produtosManuais && userAccess.produtosManuais.length > 0) {
              expressionItem += ` AND CODPROD IN (${userAccess.produtosManuais.join(',')})`;
            } else {
              expressionItem += ` AND 1 = 0`;
            }
          } else if (userAccess.data.acessoProdutos === 'MARCA') {
            if (userAccess.marcasPermitidas && userAccess.marcasPermitidas.length > 0) {
              expressionItem += ` AND Produto.CODMARCA IN (${userAccess.marcasPermitidas.join(',')})`;
            } else {
              expressionItem += ` AND 1 = 0`;
            }
          } else if (userAccess.data.acessoProdutos === 'GRUPO') {
            if (userAccess.gruposPermitidos && userAccess.gruposPermitidos.length > 0) {
              expressionItem += ` AND Produto.CODGRUPOPROD IN (${userAccess.gruposPermitidos.join(',')})`;
            } else {
              expressionItem += ` AND 1 = 0`;
            }
          }
        }
        const payloadItens = {
          serviceName: 'CRUDServiceProvider.loadRecords',
          requestBody: {
            dataSet: {
              rootEntity: 'ItemNota',
              includePresentationFields: 'N',
              offsetPage: null,
              disableRowsLimit: true,
              entity: {
                fieldset: { list: 'NUNOTA,CODPROD,QTDNEG,VLRUNIT,VLRTOT' }
              },
              criteria: {
                expression: { $: expressionItem }
              }
            }
          }
        };

        const responseItens = await sankhyaDynamicAPI.fazerRequisicao(
          idEmpresa,
          '/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json',
          'POST',
          payloadItens
        );

        const entitiesItens = responseItens?.responseBody?.entities;

        if (entitiesItens?.entity) {
          const fieldNamesItens = entitiesItens.metadata?.fields?.field?.map((f: any) => f.name) || [];
          const entityArrayItens = Array.isArray(entitiesItens.entity) ? entitiesItens.entity : [entitiesItens.entity];

          const giroProdutosMap: Record<string, { codProd: string, qtd: number, valor: number, nome: string }> = {};

          entityArrayItens.forEach((rawEntity: any) => {
            let codProd = '0';
            let qtd = 0;
            let val = 0;
            let descrProd = '';

            for (let j = 0; j < fieldNamesItens.length; j++) {
              const fieldKey = `f${j}`;
              const fieldName = fieldNamesItens[j];
              const value = rawEntity[fieldKey]?.$;
              if (fieldName === 'CODPROD') codProd = value;
              if (fieldName === 'QTDNEG') qtd = parseFloat(value) || 0;
              if (fieldName === 'VLRTOT') val = parseFloat(value) || 0;
            }

            if (!giroProdutosMap[codProd]) {
              giroProdutosMap[codProd] = { codProd, qtd: 0, valor: 0, nome: `Produto ${codProd}` };
            }
            giroProdutosMap[codProd].qtd += qtd;
            giroProdutosMap[codProd].valor += val;
          });

          const itensAgregados = Object.values(giroProdutosMap)
            .sort((a, b) => b.valor - a.valor)
            .slice(0, 5);

          // Buscar nomes dos produtos top via oracle
          const topCodProds = itensAgregados.map(p => Number(p.codProd)).filter(n => !isNaN(n));
          if (topCodProds.length > 0) {
            try {
              const placeholders = topCodProds.map((_, i) => `:cod${i}`).join(',');
              const binds: any = {};
              topCodProds.forEach((cod, i) => { binds[`cod${i}`] = cod; });
              const sqlProd = `SELECT CODPROD, DESCRPROD FROM AS_PRODUTOS WHERE CODPROD IN (${placeholders})`;
              const produtosDb = await oracleService.executeQuery(sqlProd, binds);

              itensAgregados.forEach(prod => {
                const pDb = produtosDb.find((dbP: any) => String(dbP.CODPROD) === prod.codProd);
                if (pDb && pDb.DESCRPROD) {
                  prod.nome = pDb.DESCRPROD;
                }
              });
            } catch (e: any) {
              console.log('Erro ao buscar Nomes de Produtos', e.message);
            }
          }

          topProdutos = itensAgregados;
        }
      } catch (err: any) {
        console.error('⚠️ [DASHBOARD] Erro ao buscar Itens/Giro de Produtos do Sankhya:', err.message);
      }
    }

    return NextResponse.json({
      kpis: {
        faturamento: totalFaturamento,
        ticketMedio,
        totalPedidos,
        totalClientesUnicos: Object.keys(vendasPorCliente).length
      },
      chartFaturamento,
      topClientes,
      topProdutos
    });

  } catch (error: any) {
    console.error('❌ [DASHBOARD] Erro Geral:', error);
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}
