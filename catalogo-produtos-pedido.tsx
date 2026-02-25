"use client"

import { useState, useEffect, useMemo } from "react"
import { Search, Plus, Grid3x3, List } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { OfflineDataService } from "@/lib/offline-data-service"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ConfiguracaoProdutoModal, ConfiguracaoProduto, UnidadeVolume } from "@/components/configuracao-produto-modal"
import { resolveBestPolicy, resolveAllApplicablePolicies, PolicyContext } from "@/lib/policy-engine"
import { PoliticaComercial } from "@/lib/politicas-comerciais-service"
import { ProdutoDetalhesModal } from "@/components/produto-detalhes-modal"
import { Image, Eye, Cuboid } from "lucide-react"

interface CatalogoProdutosPedidoProps {
  onAdicionarItem: (produto: any, quantidade: number, desconto?: number) => void
  tabelaPreco?: string
  tabelasPrecos?: any[]
  itensCarrinho: any[]
  onAbrirCarrinho?: () => void
  isPedidoLeadMobile?: boolean
  codParc?: string | number
  isLeadMode?: boolean
  idEmpresa?: string | number
  codEmp?: number
  codTipVenda?: number
  codVend?: number
  codEquipe?: number
}

export function CatalogoProdutosPedido({
  onAdicionarItem,
  tabelaPreco,
  tabelasPrecos = [],
  itensCarrinho = [],
  onAbrirCarrinho,
  isPedidoLeadMobile = false,
  codParc,
  isLeadMode = false,
  idEmpresa,
  codEmp,
  codTipVenda,
  codVend,
  codEquipe
}: CatalogoProdutosPedidoProps) {
  const [produtos, setProdutos] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [busca, setBusca] = useState("")
  const [buscaAplicada, setBuscaAplicada] = useState("")
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>("TODAS")
  const [categorias, setCategorias] = useState<string[]>([])
  const [paginaAtual, setPaginaAtual] = useState(1)
  const [produtoPrecos, setProdutoPrecos] = useState<any>(null)
  const [showPrecosModal, setShowPrecosModal] = useState(false)
  const [produtoSelecionadoConfig, setProdutoSelecionadoConfig] = useState<any>(null)
  const [showConfigProdutoModal, setShowConfigProdutoModal] = useState(false)
  const [maxDescontoPolitica, setMaxDescontoPolitica] = useState<number | undefined>(undefined)
  const [maxAcrescimoPolitica, setMaxAcrescimoPolitica] = useState<number | undefined>(undefined)
  const [unidadesProdutoConfig, setUnidadesProdutoConfig] = useState<UnidadeVolume[]>([])
  const [configProdutoInicial, setConfigProdutoInicial] = useState<Partial<ConfiguracaoProduto>>({
    quantidade: 1,
    desconto: 0,
    unidade: 'UN',
    preco: 0
  })
  const [showProdutoDetalhes, setShowProdutoDetalhes] = useState(false)
  const [produtoDetalhes, setProdutoDetalhes] = useState<any>(null)
  const [imagensCarregadas, setImagensCarregadas] = useState<Record<string, string>>({})
  const [loadingImagens, setLoadingImagens] = useState<Record<string, boolean>>({})
  const [tabelasConfiguracao, setTabelasConfiguracao] = useState<any[]>([])

  const ITENS_POR_PAGINA = 12

  useEffect(() => {
    carregarProdutos()
  }, [tabelaPreco, codParc])

  /* REMOVIDO: Carregamento antecipado de preços causava lentidão e spam de logs.
     Preço agora é carregado apenas ao clicar no produto (ConfiguracaoProdutoModal).
  const carregarPrecosEmChunks = async (produtosIniciais: any[], nutab: number) => {
    ...
  };
  */

  const carregarProdutos = async () => {
    setLoading(true)
    try {
      const produtosData = await OfflineDataService.getProdutos()

      const produtosComDados = produtosData.map((produto: any) => ({
        ...produto,
        preco: parseFloat(produto.AD_VLRUNIT || 0)
      }))

      setProdutos(produtosComDados)
      setLoading(false)

      const categoriasUnicas = [...new Set(produtosComDados.map(p => p.MARCA || 'SEM MARCA').filter(Boolean))] as string[]
      setCategorias(['TODAS', ...categoriasUnicas.sort()])

      // NOTA: Preços não são mais carregados antecipadamente.
      // A política e a tabela de preços serão resolvidas apenas no clique "Adicionar".

    } catch (error) {
      console.error('Erro:', error)
      setLoading(false)
    }
  }

  const normalizarTexto = (texto: string) => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

  const produtosFiltrados = useMemo(() => {
    return produtos.filter(produto => {
      const buscaNormalizada = normalizarTexto(buscaAplicada)
      const matchBusca = buscaAplicada === "" ||
        normalizarTexto(produto.DESCRPROD || '').includes(buscaNormalizada) ||
        produto.CODPROD?.toString().includes(buscaAplicada)
      const matchCategoria = categoriaFiltro === "TODAS" || (produto.MARCA || 'SEM MARCA') === categoriaFiltro
      return matchBusca && matchCategoria
    })
  }, [produtos, buscaAplicada, categoriaFiltro])

  const totalPaginas = Math.ceil(produtosFiltrados.length / ITENS_POR_PAGINA)
  const produtosPaginados = useMemo(() => {
    const inicio = (paginaAtual - 1) * ITENS_POR_PAGINA
    return produtosFiltrados.slice(inicio, inicio + ITENS_POR_PAGINA)
  }, [produtosFiltrados, paginaAtual])

  useEffect(() => { setPaginaAtual(1) }, [buscaAplicada, categoriaFiltro])

  const handleSelecionarProdutoConfig = async (produto: any) => {
    console.log('🛍️ Selecionando produto para config:', produto.CODPROD);
    setLoading(true)
    try {
      const codProdNumber = Number(produto.CODPROD)
      let nutabAlvo = 0;
      let codTabAlvo = "";
      let tabelasParaModal = [...tabelasPrecos];

      if (codParc) {
        const parceiros = await OfflineDataService.getParceiros({ search: String(codParc) });
        console.log('🔍 [Debug] Parceiros carregados (SEARCH):', parceiros?.length);
        const parceiro = parceiros.find((p: any) => String(p.CODPARC) === String(codParc));
        console.log('🔍 [Debug] Busca por parceiro:', { busca: codParc, encontrado: !!parceiro, dadosParcial: parceiro ? { NOME: parceiro.NOMEPARC, CODPARC: parceiro.CODPARC } : 'NÃO ENCONTRADO' });
        nutabAlvo = Number(parceiro?.NUTAB || parceiro?.CODTAB || 0);

        // Tentar encontrar o CODTAB correspondente ao NUTAB alvo inicial (do parceiro)
        const tabParceiro = tabelasParaModal.find(t => Number(t.NUTAB) === nutabAlvo);
        if (tabParceiro) codTabAlvo = tabParceiro.CODTAB;

        // === MOTOR DE POLÍTICAS ===
        console.log('🔍 [Debug] Verificando requisitos de política:', { codEmp, codParc, parceiroEncontrado: !!parceiro });
        if (codEmp && codParc && parceiro) {
          try {
            console.group('🔍 Iniciando Resolução de Políticas');
            console.log('🏢 Empresa (CODEMP):', codEmp, '| Parceiro:', codParc);

            // Usar getPoliticasComerciais (Local DB) para consistência
            const politicas = await OfflineDataService.getPoliticasComerciais();
            console.log('📜 Total Políticas no DB:', politicas.length);

            if (politicas && politicas.length > 0) {
              console.log('🔍 [CatalogoProdutos] Dados para contexto:', { parceiro, produto });

              let ufFinal = parceiro.UF;
              if (!ufFinal && parceiro.CODCID) {
                const cidade = await OfflineDataService.getCidade(parceiro.CODCID);
                console.log('🔍 [CatalogoProdutos] Cidade encontrada:', cidade);
                if (cidade) ufFinal = cidade.UF || cidade.UFSIGLA;
              }

              // Diagnostic Log: Full structure of partner and product
              console.log('🔍 [CatalogoProdutos] Diagnóstico de Atributos:', {
                Parceiro_Keys: Object.keys(parceiro),
                Parceiro_CODREG: parceiro.CODREG,
                Parceiro_CODCID: parceiro.CODCID,
                Parceiro_UF: parceiro.UF,
                Produto_Keys: Object.keys(produto),
                Produto_CODMARCA: produto.CODMARCA,
                Produto_CODGRUPOPROD: produto.CODGRUPOPROD,
                Prop_CodTipVenda: codTipVenda
              });

              const context: PolicyContext = {
                // tenantId: undefined, 
                codEmp: Number(codEmp), // STRICTLY use codEmp prop as requested
                codParc: Number(codParc),
                uf: ufFinal,
                codCid: parceiro.CODCID,
                codBai: parceiro.CODBAIRRO || parceiro.CODBAI,
                codReg: parceiro.CODREG,
                codProd: codProdNumber,
                marca: produto.CODMARCA || produto.MARCA,
                codVend: codVend ? Number(codVend) : Number(parceiro.CODVEND || 0),
                codEquipe: undefined,
                grupo: Number(produto.CODGRUPOPROD || produto.GRUPO || 0),
                codTipVenda: codTipVenda ? Number(codTipVenda) : undefined
              };

              console.log('📋 Contexto criado:', context);

              // *** MUDANÇA: Buscar TODAS as políticas aplicáveis ***
              const politicasAplicaveis = resolveAllApplicablePolicies(politicas, context);
              const melhorPolitica = politicasAplicaveis.length > 0 ? politicasAplicaveis[0] : null;

              if (politicasAplicaveis.length > 0) {
                console.log(`🏆 [PolicyEngine] Encontradas ${politicasAplicaveis.length} políticas aplicáveis.`);

                // Limpar lista atual para garantir "SOMENTE POLÍTICA"
                const novasTabelas: any[] = [];
                const allTabelas = await OfflineDataService.getTabelasPrecos();
                const nutabsProcessados = new Set<number>();

                for (const pol of politicasAplicaveis) {
                  if (pol.RESULT_NUTAB) {
                    const nutab = Number(pol.RESULT_NUTAB);
                    if (!nutabsProcessados.has(nutab)) {
                      // Validar STRICTLY na tabela de preços (AS_EXCECAO_PRECO)
                      const precosExcecao = await OfflineDataService.getPrecos(codProdNumber, nutab);
                      const temPreco = precosExcecao && precosExcecao.length > 0;

                      if (temPreco) {
                        const tabMetadata = allTabelas.find((t: any) => Number(t.NUTAB) === nutab);

                        // Construir objeto de tabela garantido
                        const tab = {
                          NUTAB: nutab,
                          CODTAB: tabMetadata && tabMetadata.CODTAB ? tabMetadata.CODTAB : `POL-${nutab}`,
                          DESCRICAO: tabMetadata && tabMetadata.DESCRICAO ? tabMetadata.DESCRICAO : `Tabela Política ${nutab}`
                        };

                        novasTabelas.push(tab);
                        nutabsProcessados.add(nutab);
                      } else {
                        console.warn(`⚠️ Política definiu NUTAB ${nutab} mas NÃO há preço para o produto ${codProdNumber} em AS_EXCECAO_PRECO.`);
                      }
                    }
                  }
                }

                if (novasTabelas.length > 0) {
                  console.log('✅ Lista de tabelas atualizada exclusivamente pelas políticas:', novasTabelas.map(t => t.DESCRICAO));
                  tabelasParaModal = novasTabelas;
                } else {
                  console.warn('⚠️ Políticas aplicáveis encontradas, mas nenhuma definiu tabela válida (NUTAB). Mantendo tabelas padrão.');
                }
              }

              if (melhorPolitica) {
                console.log('🏆 [PolicyEngine] Melhor política VENCEDORA (para padrão):', melhorPolitica.NOME_POLITICA);

                if (melhorPolitica.RESULT_NUTAB) {
                  const nutabPolitica = Number(melhorPolitica.RESULT_NUTAB);
                  nutabAlvo = nutabPolitica;
                  console.log('📉 [PolicyEngine] Aplicando tabela da política (NUTAB Padrão):', nutabAlvo);

                  // Verificar se essa tabela existe na lista atual (agora filtrada)
                  let targetTable = tabelasParaModal.find(t => Number(t.NUTAB) === nutabAlvo);

                  // Se por algum motivo a tabela vencedora não estiver na lista (ex: erro de carga), tentar buscar
                  if (!targetTable) {
                    const allTabelas = await OfflineDataService.getTabelasPrecos();
                    targetTable = allTabelas.find((t: any) => Number(t.NUTAB) === nutabAlvo);
                    if (targetTable) {
                      tabelasParaModal.push(targetTable);
                    }
                  }

                  if (targetTable) {
                    codTabAlvo = String(targetTable.CODTAB !== undefined ? targetTable.CODTAB : '');
                    nutabAlvo = Number(targetTable.NUTAB); // Garante que o NUTAB seja atualizado com o da tabela encontrada
                    console.log('🎯 Tabela definida para configuração inicial (CODTAB):', codTabAlvo, '| NUTAB:', nutabAlvo);
                  }

                } else {
                  console.warn('⚠️ Política vencedora não possui TABELA definida.');
                }

                if (melhorPolitica.RESULT_PERCDESCONTO_MAX !== undefined && melhorPolitica.RESULT_PERCDESCONTO_MAX !== null) {
                  setMaxDescontoPolitica(melhorPolitica.RESULT_PERCDESCONTO_MAX);
                } else {
                  setMaxDescontoPolitica(undefined);
                }

                if (melhorPolitica.RESULT_PERCACIMA_MAX !== undefined && melhorPolitica.RESULT_PERCACIMA_MAX !== null) {
                  setMaxAcrescimoPolitica(melhorPolitica.RESULT_PERCACIMA_MAX);
                } else {
                  setMaxAcrescimoPolitica(undefined);
                }
              } else {
                console.warn('⚠️ Nenhuma política atendeu aos critérios do contexto.');
                // Mantém tabelasParaModal original (parceiro/config) como fallback
                setMaxDescontoPolitica(undefined);
                setMaxAcrescimoPolitica(undefined);
              }
            } else {
              console.warn('⚠️ Nenhuma política cadastrada para esta empresa.');
            }
          } catch (policyError) {
            console.error('⚠️ Erro ao resolver políticas:', policyError);
          } finally {
            console.groupEnd();
          }
        }
      }

      let precoFinal = parseFloat(produto.AD_VLRUNIT || 0)

      // Buscar preço específico para o NUTAB alvo (se definido)
      if (nutabAlvo > 0) {
        console.log(`💲 Buscando preço final para NUTAB ${nutabAlvo}...`);
        const precos = await OfflineDataService.getPrecos(codProdNumber, nutabAlvo);
        if (precos && precos.length > 0) {
          const pr = precos[0];
          if (pr.VLRVENDA) {
            precoFinal = parseFloat(String(pr.VLRVENDA).replace(/,/g, '.'));
            console.log(`✅ Preço recuperado via política (NUTAB ${nutabAlvo}):`, precoFinal);
          }
        } else {
          console.warn(`⚠️ NUTAB ${nutabAlvo} selecionado mas preço não retornou na busca final.`);
        }
      } else {
        // Fallback original
        const precos = await OfflineDataService.getPrecos(codProdNumber);
        // ... (existing logic if needed, but usually we cover via policy)
        // If no policy, maybe generic table?
      }
      const volumes = await OfflineDataService.getVolumes(produto.CODPROD)
      const unidades: UnidadeVolume[] = [
        { CODVOL: produto.UNIDADE || 'UN', DESCRICAO: `${produto.UNIDADE || 'UN'} - Padrão`, QUANTIDADE: 1, isPadrao: true },
        ...volumes.filter((v: any) => v.ATIVO === 'S').map((v: any) => ({ CODVOL: v.CODVOL, DESCRICAO: v.DESCRDANFE || v.CODVOL, QUANTIDADE: v.QUANTIDADE || 1, isPadrao: false }))
      ]

      console.log('📦 Unidades carregadas:', unidades.length);
      setTabelasConfiguracao(tabelasParaModal); // Atualizar estado para o modal
      setUnidadesProdutoConfig(unidades)
      setConfigProdutoInicial({ quantidade: 1, desconto: 0, unidade: produto.UNIDADE || 'UN', preco: precoFinal, tabelaPreco: codTabAlvo, nutab: nutabAlvo, precoBase: precoFinal })
      setProdutoSelecionadoConfig({ ...produto, preco: precoFinal })
      setShowConfigProdutoModal(true)
      console.log('🚀 Modal deve abrir agora');
    } catch (e) {
      console.error('❌ Erro ao abrir modal de config:', e);
      toast.error('Erro ao carregar detalhes do produto');
    } finally {
      setLoading(false)
    }
  }

  const handleVerPrecos = async (produto: any) => {
    try {
      const tabelasConfig = await OfflineDataService.getTabelasPrecosConfig()
      const allTabelas = await OfflineDataService.getTabelasPrecos()

      // Combinar tabelas de configuração com todas as tabelas
      const tabelasParaConsultar = tabelasPrecos.length > 0 ? [...tabelasPrecos] : (tabelasConfig.length > 0 ? [...tabelasConfig] : [...allTabelas]);

      // GARANTIR que a tabela selecionada (via Política/Parceiro) esteja na lista de consulta
      if (tabelaPreco) {
        const exists = tabelasParaConsultar.find(t => String(t.NUTAB) === String(tabelaPreco));
        if (!exists) {
          const target = allTabelas.find(t => String(t.NUTAB) === String(tabelaPreco));
          if (target) {
            console.log('➕ Adicionando tabela da política à consulta de preços:', target.DESCRICAO);
            tabelasParaConsultar.push(target);
          }
        }
      }

      const precosData = await Promise.all(tabelasParaConsultar.map(async (tabela: any) => {
        const precos = await OfflineDataService.getPrecos(Number(produto.CODPROD))
        const pr = precos.find(p => Number(p.NUTAB) === Number(tabela.NUTAB))
        return {
          tabela: tabela.DESCRICAO || `Tabela ${tabela.CODTAB}`,
          preco: pr?.VLRVENDA ? parseFloat(String(pr.VLRVENDA).replace(/,/g, '.')) : 0,
          nutab: tabela.NUTAB
        }
      }))

      // Filtrar preços > 0 OU se for a tabela selecionada (Política/Parceiro)
      setProdutoPrecos({
        produto,
        precos: precosData.filter(p => p.preco > 0 || String(p.nutab) === String(tabelaPreco))
      })
      setShowPrecosModal(true)
    } catch (e) {
      console.error('Erro ao buscar preços:', e);
      toast.error('Erro ao buscar preços');
    }
  }

  const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

  const handleConfirmarProduto = (config: ConfiguracaoProduto) => {
    if (!produtoSelecionadoConfig) return
    const vlrSubtotal = config.preco * config.quantidade
    const vlrTotal = vlrSubtotal * (1 - config.desconto / 100)
    onAdicionarItem({
      ...produtoSelecionadoConfig,
      CODVOL: config.unidade,
      VLRUNIT: config.preco,
      preco: config.preco,
      VLRTOT: vlrTotal,
      PERCDESC: config.desconto,
      QTDNEG: config.quantidade,
      MAX_DESC_PERMITIDO: maxDescontoPolitica,
      MAX_ACRE_PERMITIDO: maxAcrescimoPolitica,
      AD_VLRUNIT: config.precoBase || (configProdutoInicial?.preco || config.preco),
      precoBase: config.precoBase || (configProdutoInicial?.preco || config.preco)
    }, config.quantidade, config.desconto)
    toast.success("Produto adicionado")
    setShowConfigProdutoModal(false)
  }

  const carregarImagemProduto = async (codProd: string | number) => {
    const id = String(codProd)
    if (imagensCarregadas[id] || loadingImagens[id]) return

    setLoadingImagens(prev => ({ ...prev, [id]: true }))
    try {
      const response = await fetch(`/api/sankhya/produtos/imagem?codProd=${id}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        setImagensCarregadas(prev => ({ ...prev, [id]: url }))
      } else {
        // Marca como carregado mas sem imagem (null) para não tentar de novo
        setImagensCarregadas(prev => ({ ...prev, [id]: 'null' }))
      }
    } catch (error) {
      console.error("Erro ao carregar imagem", error)
      setImagensCarregadas(prev => ({ ...prev, [id]: 'null' }))
    } finally {
      setLoadingImagens(prev => ({ ...prev, [id]: false }))
    }
  }

  // Access Control Check
  if (!codParc || !idEmpresa) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground bg-gray-50/50 rounded-lg border-2 border-dashed border-gray-200 p-8">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <Grid3x3 className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-700">Catálogo Bloqueado</h3>
        <p className="text-sm text-center max-w-xs mt-2">
          Selecione um Parceiro e uma Empresa no cabeçalho para visualizar os produtos disponíveis e suas políticas.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex gap-2 shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar produtos..." value={busca} onChange={(e) => setBusca(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && setBuscaAplicada(busca)} className="pl-10" />
        </div>
        <Button onClick={() => setBuscaAplicada(busca)} className="bg-green-600 hover:bg-green-700">Filtrar</Button>
      </div>

      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div></div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-1">
            {produtosPaginados.map((p) => (
              <Card key={p.CODPROD} className="hover:shadow-md transition-shadow">
                <CardContent className="p-3 flex flex-col h-full gap-3">
                  {/* Header do Card */}
                  <div className="flex justify-between items-start">
                    <p className="text-[10px] text-muted-foreground font-mono bg-gray-100 px-1.5 py-0.5 rounded">#{p.CODPROD}</p>
                    {p.MARCA && <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">{p.MARCA}</span>}
                  </div>

                  {/* Imagem Placeholder */}
                  <div className="relative w-full aspect-video bg-gray-50 rounded-md border border-gray-100 flex items-center justify-center overflow-hidden group">
                    {imagensCarregadas[String(p.CODPROD)] && imagensCarregadas[String(p.CODPROD)] !== 'null' ? (
                      <img src={imagensCarregadas[String(p.CODPROD)]} alt={p.DESCRPROD} className="w-full h-full object-contain p-2" />
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-2 text-gray-300">
                        {loadingImagens[String(p.CODPROD)] ? (
                          <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <Image className="w-8 h-8" />
                            <span className="text-[10px]">Sem imagem</span>
                          </>
                        )}
                      </div>
                    )}

                    {/* Botão Ver Imagem (Overlay) */}
                    {(!imagensCarregadas[String(p.CODPROD)] && !loadingImagens[String(p.CODPROD)]) && (
                      <div className="absolute inset-0 bg-black/0 hover:bg-black/5 transition-colors flex items-center justify-center cursor-pointer" onClick={() => carregarImagemProduto(p.CODPROD)}>
                        <Button variant="ghost" size="sm" className="hidden group-hover:flex bg-white/80 hover:bg-white text-xs h-7 shadow-sm">
                          <Eye className="w-3 h-3 mr-1.5" /> Ver Imagem
                        </Button>
                      </div>
                    )}
                  </div>

                  <h4 className="font-semibold text-xs md:text-sm line-clamp-2 min-h-[36px] items-center flex" title={p.DESCRPROD}>
                    {p.DESCRPROD}
                  </h4>

                  <div className="mt-auto grid grid-cols-2 gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setProdutoDetalhes(p); setShowProdutoDetalhes(true) }}
                      className="h-8 text-xs px-0"
                    >
                      Detalhes
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleSelecionarProdutoConfig(p)}
                      className="bg-green-600 hover:bg-green-700 h-8 text-xs px-0"
                    >
                      <Plus className="w-3 h-3 mr-1" /> Add
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loading && totalPaginas > 1 && (
          <div className="flex justify-center gap-2 mt-6 pb-4">
            <Button variant="outline" size="sm" disabled={paginaAtual === 1} onClick={() => setPaginaAtual(p => p - 1)}>Anterior</Button>
            <span className="text-sm self-center">Pág {paginaAtual} / {totalPaginas}</span>
            <Button variant="outline" size="sm" disabled={paginaAtual === totalPaginas} onClick={() => setPaginaAtual(p => p + 1)}>Próxima</Button>
          </div>
        )}
      </ScrollArea>

      <ConfiguracaoProdutoModal
        open={showConfigProdutoModal}
        onOpenChange={setShowConfigProdutoModal}
        onConfirmar={handleConfirmarProduto}
        produto={produtoSelecionadoConfig}
        tabelasPrecos={tabelasConfiguracao} // Passar tabelas atualizadas
        unidades={unidadesProdutoConfig}
        configInicial={configProdutoInicial}
        maxDesconto={maxDescontoPolitica}
        maxAcrescimo={maxAcrescimoPolitica}
        onVerPrecos={() => handleVerPrecos(produtoSelecionadoConfig)}
      />

      <Dialog open={showPrecosModal} onOpenChange={setShowPrecosModal}>
        <DialogContent><DialogHeader><DialogTitle>Tabelas de Preço</DialogTitle></DialogHeader>
          <div className="space-y-2">{produtoPrecos?.precos.map((p: any, i: number) => (<div key={i} className="flex justify-between p-2 border-b last:border-0"><span className="text-sm">{p.tabela}</span><span className="font-bold text-green-600">{formatCurrency(p.preco)}</span></div>))}</div>
        </DialogContent>
      </Dialog>

      <ProdutoDetalhesModal
        produto={produtoDetalhes}
        isOpen={showProdutoDetalhes}
        onClose={() => setShowProdutoDetalhes(false)}
      />
    </div>
  )
}
