// lib/politicas-comerciais-service.ts
import { oracleService } from './oracle-db';

// Interface que representa a estrutura de uma política comercial
export interface PoliticaComercial {
  ID_POLITICA?: number;
  ID_EMPRESA: number;
  ESCOPO_EMPRESAS?: string;
  NOME_POLITICA: string;
  DESCRICAO?: string;
  ATIVO: 'S' | 'N';
  DATA_CRIACAO?: string;
  DATA_ATUALIZACAO?: string;
  PRIORIDADE?: number;

  ESCOPO_REGIOES?: string;
  ESCOPO_ESTADOS?: string;
  ESCOPO_CIDADES?: string;
  ESCOPO_BAIRROS?: string;

  SEG_PERFIS_CLIENTE?: string;
  SEG_VENDEDORES?: string;
  SEG_EQUIPES?: string;
  SEG_CLIENTES_MANUAL?: string;
  SEG_CLIENTES?: string;

  COND_COMERCIAIS?: string;
  COND_TIPOS_TITULO?: string;

  PROD_MARCAS?: string;
  PROD_FAMILIAS?: string; // Alias para PROD_GRUPOS?
  PROD_GRUPOS?: string;
  PROD_PRODUTOS_MANUAL?: string;

  RESULT_NUTAB?: string | number;
  RESULT_PERCDESCONTO_MAX?: number;
  RESULT_PERCACIMA_MAX?: number;
}

/**
 * Consulta todas as políticas comerciais para uma determinada empresa.
 * @param idEmpresa - O ID da empresa.
 * @returns Uma lista de políticas comerciais.
 */
export async function consultarPoliticas(idEmpresa: number): Promise<PoliticaComercial[]> {
  console.log(`[Oracle] Consultando políticas comerciais para a empresa: ${idEmpresa}`);
  try {
    const sql = `
      SELECT
        ID_POLITICA,
        ID_EMPRESA,
        ESCOPO_EMPRESAS,
        NOME_POLITICA,
        DESCRICAO,
        ATIVO,
        TO_CHAR(DATA_CRIACAO, 'DD/MM/YYYY HH24:MI') AS DATA_CRIACAO,
        TO_CHAR(DATA_ATUALIZACAO, 'DD/MM/YYYY HH24:MI') AS DATA_ATUALIZACAO,
        PRIORIDADE,
        ESCOPO_REGIOES,
        ESCOPO_ESTADOS,
        ESCOPO_CIDADES,
        ESCOPO_BAIRROS,
        SEG_PERFIS_CLIENTE,
        SEG_VENDEDORES,
        SEG_EQUIPES,
        SEG_CLIENTES_MANUAL,
        COND_COMERCIAIS,
        COND_TIPOS_TITULO,
        PROD_MARCAS,
        PROD_FAMILIAS,
        PROD_PRODUTOS_MANUAL,
        RESULT_NUTAB,
        RESULT_PERCDESCONTO_MAX,
        RESULT_PERCACIMA_MAX
      FROM AD_POLITICASCOMERCIAIS
      WHERE ID_EMPRESA = :idEmpresa
      ORDER BY PRIORIDADE, NOME_POLITICA
    `;
    const result = await oracleService.executeQuery<PoliticaComercial>(sql, { idEmpresa });
    console.log(`[Oracle] ${result.length} políticas comerciais encontradas.`);
    return result;
  } catch (error) {
    console.error('[Oracle] Erro ao consultar políticas comerciais:', error);
    throw new Error('Falha ao consultar as políticas comerciais no banco de dados.');
  }
}

/**
 * Salva (cria ou atualiza) uma política comercial.
 * @param politica - O objeto da política comercial a ser salvo.
 * @returns A política comercial salva.
 */
export async function salvarPolitica(politica: PoliticaComercial): Promise<PoliticaComercial> {
  const isUpdate = !!politica.ID_POLITICA;
  console.log(`[Oracle] Salvando política (${isUpdate ? 'atualização' : 'criação'}):`, politica.NOME_POLITICA);

  try {
    if (isUpdate) {
      // Atualização
      const sql = `
        UPDATE AD_POLITICASCOMERCIAIS SET
          NOME_POLITICA = :NOME_POLITICA,
          ESCOPO_EMPRESAS = :ESCOPO_EMPRESAS,
          DESCRICAO = :DESCRICAO,
          ATIVO = :ATIVO,
          DATA_ATUALIZACAO = SYSDATE,
          PRIORIDADE = :PRIORIDADE,
          ESCOPO_REGIOES = :ESCOPO_REGIOES,
          ESCOPO_ESTADOS = :ESCOPO_ESTADOS,
          ESCOPO_CIDADES = :ESCOPO_CIDADES,
          ESCOPO_BAIRROS = :ESCOPO_BAIRROS,
          SEG_PERFIS_CLIENTE = :SEG_PERFIS_CLIENTE,
          SEG_VENDEDORES = :SEG_VENDEDORES,
          SEG_EQUIPES = :SEG_EQUIPES,
          SEG_CLIENTES_MANUAL = :SEG_CLIENTES_MANUAL,
          COND_COMERCIAIS = :COND_COMERCIAIS,
          COND_TIPOS_TITULO = :COND_TIPOS_TITULO,
          PROD_MARCAS = :PROD_MARCAS,
          PROD_FAMILIAS = :PROD_FAMILIAS,
          PROD_PRODUTOS_MANUAL = :PROD_PRODUTOS_MANUAL,
          RESULT_NUTAB = :RESULT_NUTAB,
          RESULT_PERCDESCONTO_MAX = :RESULT_PERCDESCONTO_MAX,
          RESULT_PERCACIMA_MAX = :RESULT_PERCACIMA_MAX
        WHERE ID_POLITICA = :ID_POLITICA AND ID_EMPRESA = :ID_EMPRESA
      `;

      const params = {
        ID_POLITICA: politica.ID_POLITICA,
        ID_EMPRESA: politica.ID_EMPRESA,
        ESCOPO_EMPRESAS: politica.ESCOPO_EMPRESAS || null,
        NOME_POLITICA: politica.NOME_POLITICA,
        DESCRICAO: politica.DESCRICAO || null,
        ATIVO: politica.ATIVO,
        PRIORIDADE: politica.PRIORIDADE || 0,
        ESCOPO_REGIOES: politica.ESCOPO_REGIOES || null,
        ESCOPO_ESTADOS: politica.ESCOPO_ESTADOS || null,
        ESCOPO_CIDADES: politica.ESCOPO_CIDADES || null,
        ESCOPO_BAIRROS: politica.ESCOPO_BAIRROS || null,
        SEG_PERFIS_CLIENTE: politica.SEG_PERFIS_CLIENTE || null,
        SEG_VENDEDORES: politica.SEG_VENDEDORES || null,
        SEG_EQUIPES: politica.SEG_EQUIPES || null,
        SEG_CLIENTES_MANUAL: politica.SEG_CLIENTES_MANUAL || null,
        COND_COMERCIAIS: politica.COND_COMERCIAIS || null,
        COND_TIPOS_TITULO: politica.COND_TIPOS_TITULO || null,
        PROD_MARCAS: politica.PROD_MARCAS || null,
        PROD_FAMILIAS: politica.PROD_FAMILIAS || null,
        PROD_PRODUTOS_MANUAL: politica.PROD_PRODUTOS_MANUAL || null,
        RESULT_NUTAB: politica.RESULT_NUTAB || null,
        RESULT_PERCDESCONTO_MAX: politica.RESULT_PERCDESCONTO_MAX || null,
        RESULT_PERCACIMA_MAX: politica.RESULT_PERCACIMA_MAX || null,
      };

      console.log('🔍 [UPDATE] Params sendo enviados para Oracle:', JSON.stringify(params, null, 2));

      await oracleService.executeQuery(sql, params);
    } else {
      // Inserção
      const sql = `
        INSERT INTO AD_POLITICASCOMERCIAIS (
          ID_EMPRESA, ESCOPO_EMPRESAS, NOME_POLITICA, DESCRICAO, ATIVO, PRIORIDADE,
          ESCOPO_REGIOES, ESCOPO_ESTADOS, ESCOPO_CIDADES, ESCOPO_BAIRROS,
          SEG_PERFIS_CLIENTE, SEG_VENDEDORES, SEG_EQUIPES, SEG_CLIENTES_MANUAL,
          COND_COMERCIAIS, COND_TIPOS_TITULO,
          PROD_MARCAS, PROD_FAMILIAS, PROD_PRODUTOS_MANUAL,
          RESULT_NUTAB, RESULT_PERCDESCONTO_MAX, RESULT_PERCACIMA_MAX
        ) VALUES (
          :ID_EMPRESA, :ESCOPO_EMPRESAS, :NOME_POLITICA, :DESCRICAO, :ATIVO, :PRIORIDADE,
          :ESCOPO_REGIOES, :ESCOPO_ESTADOS, :ESCOPO_CIDADES, :ESCOPO_BAIRROS,
          :SEG_PERFIS_CLIENTE, :SEG_VENDEDORES, :SEG_EQUIPES, :SEG_CLIENTES_MANUAL,
          :COND_COMERCIAIS, :COND_TIPOS_TITULO,
          :PROD_MARCAS, :PROD_FAMILIAS, :PROD_PRODUTOS_MANUAL,
          :RESULT_NUTAB, :RESULT_PERCDESCONTO_MAX, :RESULT_PERCACIMA_MAX
        )
      `;
      // Definindo valores padrão para campos que podem ser nulos para evitar erros do Oracle
      const params = {
        ID_EMPRESA: politica.ID_EMPRESA,
        ESCOPO_EMPRESAS: politica.ESCOPO_EMPRESAS || null,
        NOME_POLITICA: politica.NOME_POLITICA,
        DESCRICAO: politica.DESCRICAO || null,
        ATIVO: politica.ATIVO,
        PRIORIDADE: politica.PRIORIDADE || 0,
        ESCOPO_REGIOES: politica.ESCOPO_REGIOES || null,
        ESCOPO_ESTADOS: politica.ESCOPO_ESTADOS || null,
        ESCOPO_CIDADES: politica.ESCOPO_CIDADES || null,
        ESCOPO_BAIRROS: politica.ESCOPO_BAIRROS || null,
        SEG_PERFIS_CLIENTE: politica.SEG_PERFIS_CLIENTE || null,
        SEG_VENDEDORES: politica.SEG_VENDEDORES || null,
        SEG_EQUIPES: politica.SEG_EQUIPES || null,
        SEG_CLIENTES_MANUAL: politica.SEG_CLIENTES_MANUAL || null,
        COND_COMERCIAIS: politica.COND_COMERCIAIS || null,
        COND_TIPOS_TITULO: politica.COND_TIPOS_TITULO || null,
        PROD_MARCAS: politica.PROD_MARCAS || null,
        PROD_FAMILIAS: politica.PROD_FAMILIAS || null,
        PROD_PRODUTOS_MANUAL: politica.PROD_PRODUTOS_MANUAL || null,
        RESULT_NUTAB: politica.RESULT_NUTAB || null,
        RESULT_PERCDESCONTO_MAX: politica.RESULT_PERCDESCONTO_MAX || null,
        RESULT_PERCACIMA_MAX: politica.RESULT_PERCACIMA_MAX || null,
      };

      console.log('🔍 [INSERT] Params sendo enviados para Oracle:', JSON.stringify(params, null, 2));

      await oracleService.executeQuery(sql, params);
    }

    // Retorna a política salva (ou a mais recente, no caso de inserção)
    const result = await oracleService.executeOne<PoliticaComercial>(
      `SELECT * FROM AD_POLITICASCOMERCIAIS
       WHERE ID_EMPRESA = :ID_EMPRESA
       ORDER BY DATA_CRIACAO DESC
       FETCH FIRST 1 ROWS ONLY`, { ID_EMPRESA: politica.ID_EMPRESA }
    );
    return result!;

  } catch (error) {
    console.error('[Oracle] Erro ao salvar política comercial:', error);
    throw new Error('Falha ao salvar a política comercial no banco de dados.');
  }
}

/**
 * Exclui uma política comercial.
 * @param idPolitica - O ID da política a ser excluída.
 */
export async function excluirPolitica(idPolitica: number): Promise<void> {
  console.log(`[Oracle] Excluindo política: ${idPolitica}`);
  try {
    const sql = `DELETE FROM AD_POLITICASCOMERCIAIS WHERE ID_POLITICA = :idPolitica`;
    await oracleService.executeQuery(sql, { idPolitica });
  } catch (error) {
    console.error('[Oracle] Erro ao excluir política comercial:', error);
    throw new Error('Falha ao excluir a política comercial no banco de dados.');
  }
}
