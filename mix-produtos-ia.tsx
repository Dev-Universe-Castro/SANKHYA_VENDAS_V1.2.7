"use client"

import { useState, useEffect } from "react"
import { Plus, Package, TrendingUp, RefreshCw, ShoppingCart, Sparkles, AlertCircle, Eye, WifiOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import { ConfiguracaoProdutoModal, ConfiguracaoProduto, UnidadeVolume, TabelaPreco } from "@/components/configuracao-produto-modal"
import { ProdutoDetalhesModal } from "@/components/produto-detalhes-modal"
import { resolveBestPolicy, resolveAllApplicablePolicies, PolicyContext } from "@/lib/policy-engine"

interface MixProdutosIAProps {
  codParc: string | number
  nomeParceiro?: string
  onAdicionarItem: (produto: any, quantidade: number, desconto?: number, tabelaPreco?: string) => void
  onVerPrecos?: () => void
  itensCarrinho: any[]
  isPedidoLeadMobile?: boolean
  idEmpresa?: string | number
  codEmp?: number
  codTipVenda?: number
  codVend?: number
  codEquipe?: number
}

export function MixProdutosIA({
  codParc,
  nomeParceiro,
  onAdicionarItem,
  onVerPrecos,
  itensCarrinho = [],
  isPedidoLeadMobile = false,
  idEmpresa,
  codEmp,
  codTipVenda,
  codVend,
  codEquipe
}: MixProdutosIAProps) {
  const [loading, setLoading] = useState(false)
  const [sugestoes, setSugestoes] = useState<any[]>([])
  const [resumo, setResumo] = useState<any>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [isOnline, setIsOnline] = useState(true)
  const [produtoImagens, setProdutoImagens] = useState<{ [key: string]: string | null }>({})
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [produtoSelecionado, setProdutoSelecionado] = useState<any>(null)
  const [unidadesProdutoConfig, setUnidadesProdutoConfig] = useState<UnidadeVolume[]>([])
  const [tabelasPrecos, setTabelasPrecos] = useState<TabelaPreco[]>([]) // Tabelas generais do parceiro/config
  const [tabelasPrecosConfigModal, setTabelasPrecosConfigModal] = useState<any[]>([]) // Tabelas específicas filtradas para o modal
  const [maxDescontoPolitica, setMaxDescontoPolitica] = useState<number | undefined>(undefined)
  const [maxAcrescimoPolitica, setMaxAcrescimoPolitica] = useState<number | undefined>(undefined)
  const [configProdutoInicial, setConfigProdutoInicial] = useState<Partial<ConfiguracaoProduto>>({
    quantidade: 1,
    desconto: 0,
    preco: 0,
    unidade: 'UN',
    tabelaPreco: 'PADRAO'
  })
  const [showDetalhesModal, setShowDetalhesModal] = useState(false)
  const [produtoDetalhes, setProdutoDetalhes] = useState<any>(null)

  // Sync isPedidoLeadMobile logic or ensure it's used if needed
  const isMobile = isPedidoLeadMobile || (typeof window !== 'undefined' && window.innerWidth < 768)

  useEffect(() => {
    setIsOnline(window.navigator.onLine)
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    if (codParc && codParc !== "0" && codParc !== "") {
      if (isOnline) {
        buscarMixProdutos()
      }
      carregarTabelasPrecos()
    }
  }, [codParc, isOnline])

  const carregarTabelasPrecos = async () => {
    try {
      // 1. Buscar parceiro no IndexedDB para pegar o CODTAB
      const { OfflineDataService } = await import('@/lib/offline-data-service')
      const parceiros = await OfflineDataService.getParceiros()
      const parceiro = parceiros.find(p => String(p.CODPARC) === String(codParc))
      const codTabParceiro = parceiro?.CODTAB

      // 2. Buscar tabelas de preço configuradas no sistema (padrão) do IndexedDB
      const configs = await OfflineDataService.getTabelasPrecosConfig()
      const allTabelas = await OfflineDataService.getTabelasPrecos()

      // 3. Se o parceiro tiver CODTAB, buscar as tabelas reais (NUTABs) vinculadas a esse CODTAB
      if (codTabParceiro) {
        const tabelasParceiro = allTabelas.filter(t => String(t.CODTAB) === String(codTabParceiro))

        if (tabelasParceiro.length > 0) {
          const novasTabelas: TabelaPreco[] = tabelasParceiro.map((t: any) => ({
            CODTAB: String(t.CODTAB),
            DESCRICAO: `Tabela ${t.CODTAB}`,
            NUTAB: t.NUTAB
          }))

          const IDsParceiro = new Set(novasTabelas.map(t => t.CODTAB))

          // Mapear NUTAB para as tabelas de configuração também
          const configsComNutab = configs.map((c: any) => {
            const tabSankhya = allTabelas.find(t => String(t.CODTAB) === String(c.CODTAB))
            return {
              ...c,
              NUTAB: tabSankhya?.NUTAB || c.NUTAB
            }
          })

          const configsFiltradas = configsComNutab.filter((c: any) => !IDsParceiro.has(String(c.CODTAB)))

          const tabelasFinais = [...novasTabelas, ...configsFiltradas]
          setTabelasPrecos(tabelasFinais)

          if (novasTabelas.length > 0) {
            setConfigProdutoInicial(prev => ({
              ...prev,
              tabelaPreco: novasTabelas[0].CODTAB
            }))
          }
          return
        }
      }

      // Fallback: garantir NUTAB nas configs mesmo sem parceiro
      const configsFinais = configs.map((c: any) => {
        const tabSankhya = allTabelas.find(t => String(t.CODTAB) === String(c.CODTAB))
        return {
          ...c,
          NUTAB: tabSankhya?.NUTAB || c.NUTAB
        }
      })
      setTabelasPrecos(configsFinais)
    } catch (error) {
      console.error('Erro ao carregar tabelas de preços:', error)
    }
  }

  const buscarMixProdutos = async () => {
    if (!codParc || codParc === "0") {
      setErro("Selecione um parceiro para ver as sugestões de produtos")
      return
    }

    setLoading(true)
    setErro(null)

    try {
      const response = await fetch('/api/mix-produtos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codParc, meses: 3 })
      })

      if (!response.ok) {
        throw new Error('Erro ao buscar mix de produtos')
      }

      const data = await response.json()
      setSugestoes(data.sugestoes || [])
      setResumo(data.resumo || null)

      if (data.sugestoes?.length > 0) {
        data.sugestoes.slice(0, 8).forEach((s: any) => {
          buscarImagemProduto(s.CODPROD)
        })
      }

    } catch (error: any) {
      console.error('[MIX-IA] Erro:', error)
      setErro(error.message || 'Erro ao buscar sugestões')
    } finally {
      setLoading(false)
    }
  }

  const buscarImagemProduto = async (codProd: string | number) => {
    if (produtoImagens[codProd] !== undefined) return

    try {
      const response = await fetch(`/api/sankhya/produtos/imagem?codProd=${codProd}`)
      if (response.ok) {
        const blob = await response.blob()
        const imageUrl = URL.createObjectURL(blob)
        setProdutoImagens(prev => ({ ...prev, [codProd]: imageUrl }))
      } else {
        setProdutoImagens(prev => ({ ...prev, [codProd]: null }))
      }
    } catch {
      setProdutoImagens(prev => ({ ...prev, [codProd]: null }))
    }
  }

  const handleTabelaPrecoChange = async (codTab: string) => {
    if (!produtoSelecionado) return

    try {
      const { OfflineDataService } = await import('@/lib/offline-data-service')

      if (codTab === 'PADRAO') {
        const precoBase = produtoSelecionado.VLRUNIT || (produtoSelecionado.valorTotal / produtoSelecionado.qtdComprada) || 0
        setConfigProdutoInicial(prev => ({
          ...prev,
          preco: precoBase,
          tabelaPreco: 'PADRAO'
        }))
        return
      }

      // Buscar preço no IndexedDB
      const precos = await OfflineDataService.getPrecos(Number(produtoSelecionado.CODPROD))

      // Encontrar a tabela selecionada para obter o NUTAB
      const tabela = tabelasPrecosConfigModal.find(t => String(t.CODTAB) === String(codTab))

      if (tabela && tabela.NUTAB) {
        // Buscar preço exato no IndexedDB pelo NUTAB
        const precoEncontrado = precos.find(p => Number(p.NUTAB) === Number(tabela.NUTAB))

        if (precoEncontrado && precoEncontrado.VLRVENDA) {
          const valor = parseFloat(String(precoEncontrado.VLRVENDA).replace(/,/g, '.'))
          console.log(`✅ Preço encontrado no IndexedDB para NUTAB ${tabela.NUTAB}:`, valor)
          setConfigProdutoInicial(prev => ({
            ...prev,
            preco: valor,
            tabelaPreco: codTab
          }))
          return
        }
      }

      // Fallback para API removido por preferência IndexedDB
      console.warn(`Preço não encontrado no IndexedDB para CODTAB ${codTab} (NUTAB ${tabela?.NUTAB})`)
    } catch (error) {
      console.error('Erro ao buscar preço da tabela:', error)
      toast.error('Erro ao buscar preço da tabela')
    }
  }

  const abrirConfiguracao = async (produto: any) => {
    const jaNoCarrinho = itensCarrinho.some(item => String(item.CODPROD) === String(produto.CODPROD))

    if (jaNoCarrinho) {
      toast.warning("Produto já está no carrinho", {
        description: produto.DESCRPROD
      })
      return
    }

    setLoading(true)
    try {
      // 1. Buscar parceiro no IndexedDB para pegar o CODTAB
      const { OfflineDataService } = await import('@/lib/offline-data-service')
      const parceiros = await OfflineDataService.getParceiros({ search: String(codParc) })
      const parceiro = parceiros.find(p => String(p.CODPARC) === String(codParc))

      // Lógica de seleção de tabela: 
      // 1. CODTAB do parceiro
      // 2. Fallback para AD_TABELASPRECOSCONFIG (tabelasPrecosConfig)
      let codTabFinal: string | null = null

      if (parceiro?.CODTAB && Number(parceiro.CODTAB) > 0) {
        codTabFinal = String(parceiro.CODTAB)
        console.log(`📍 Usando CODTAB preferencial do parceiro: ${codTabFinal}`)
      } else {
        const configs = await OfflineDataService.getTabelasPrecosConfig()
        if (configs && configs.length > 0) {
          codTabFinal = String(configs[0].CODTAB)
          console.log(`📍 Parceiro sem tabela. Usando fallback da configuração: ${codTabFinal}`)
        }
      }

      // === MOTOR DE POLÍTICAS (Check Policy to Override Table) ===
      if (codEmp && codParc && parceiro) {
        try {
          console.group('🔍 [MixIA] Resolução de Políticas');
          const politicas = await OfflineDataService.getPoliticasComerciais();

          if (politicas && politicas.length > 0) {
            console.log('🔍 [MixProdutosIA] Dados para contexto:', { parceiro, produto });

            let ufFinal = parceiro.UF;
            if (!ufFinal && parceiro.CODCID) {
              const cidade = await OfflineDataService.getCidade(parceiro.CODCID);
              console.log('🔍 [MixProdutosIA] Cidade encontrada:', cidade);
              if (cidade) ufFinal = cidade.UF || cidade.UFSIGLA;
            }

            // Diagnostic Log: Full structure of partner and product
            console.log('🔍 [MixProdutosIA] Diagnóstico de Atributos:', {
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
              codEmp: Number(codEmp),
              codParc: Number(codParc),
              uf: ufFinal,
              codCid: parceiro.CODCID,
              codBai: parceiro.CODBAIRRO || parceiro.CODBAI,
              codReg: parceiro.CODREG,
              codProd: Number(produto.CODPROD),
              marca: produto.CODMARCA || produto.MARCA,
              codVend: codVend ? Number(codVend) : Number(parceiro.CODVEND || 0),
              codEquipe: codEquipe ? Number(codEquipe) : undefined,
              grupo: Number(produto.CODGRUPOPROD || produto.GRUPO || 0),
              codTipVenda: Number(codTipVenda || 0)
            };

            // *** MUDANÇA: Buscar TODAS as políticas aplicáveis para definir opções de tabela ***
            const politicasAplicaveis = resolveAllApplicablePolicies(politicas, context);
            const melhorPolitica = politicasAplicaveis.length > 0 ? politicasAplicaveis[0] : null;

            let tabelasFiltradasParaProduto: any[] = [];

            if (politicasAplicaveis.length > 0) {
              // Tenta buscar tabelas das políticas
              const allTabelas = await OfflineDataService.getTabelasPrecos();
              const nutabsProcessados = new Set<number>();

              for (const pol of politicasAplicaveis) {
                if (pol.RESULT_NUTAB) {
                  const nutab = Number(pol.RESULT_NUTAB);
                  if (!nutabsProcessados.has(nutab)) {
                    // Validar se existe preço para este produto e NUTAB
                    const precosExcecao = await OfflineDataService.getPrecos(Number(produto.CODPROD), nutab);
                    const temPreco = precosExcecao && precosExcecao.length > 0;

                    let tab = allTabelas.find((t: any) => Number(t.NUTAB) === nutab);

                    if (temPreco) {
                      if (!tab) {
                        console.warn(`⚠️ [MixIA] NUTAB ${nutab} possui preço mas não está em Tabelas de Preço. Criando tabela sintética.`);
                        tab = {
                          NUTAB: nutab,
                          CODTAB: `POL-${nutab}`,
                          DESCRICAO: `Tabela Especial ${nutab}`
                        };
                      }
                      tabelasFiltradasParaProduto.push(tab);
                      nutabsProcessados.add(nutab);
                    } else if (tab) {
                      // Se tem definição de tabela mas não achou preço específico, adiciona também (pode ter lógica de fallback)
                      tabelasFiltradasParaProduto.push(tab);
                      nutabsProcessados.add(nutab);
                    }
                  }
                }
              }
            }

            // Se encontrou tabelas via política, usa elas. Senão, mantém as gerais (fallback).
            if (tabelasFiltradasParaProduto.length > 0) {
              setTabelasPrecosConfigModal(tabelasFiltradasParaProduto);
            } else {
              setTabelasPrecosConfigModal(tabelasPrecos); // Fallback para tabelas gerais
            }

            if (melhorPolitica && melhorPolitica.RESULT_PERCDESCONTO_MAX !== undefined && melhorPolitica.RESULT_PERCDESCONTO_MAX !== null) {
              setMaxDescontoPolitica(melhorPolitica.RESULT_PERCDESCONTO_MAX);
            } else {
              setMaxDescontoPolitica(undefined);
            }

            if (melhorPolitica && melhorPolitica.RESULT_PERCACIMA_MAX !== undefined && melhorPolitica.RESULT_PERCACIMA_MAX !== null) {
              setMaxAcrescimoPolitica(melhorPolitica.RESULT_PERCACIMA_MAX);
            } else {
              setMaxAcrescimoPolitica(undefined);
            }

            if (melhorPolitica && melhorPolitica.RESULT_NUTAB) {
              console.log('🏆 [MixIA] Política VENCEDORA definiu tabela:', melhorPolitica.RESULT_NUTAB);

              // Find the CODTAB corresponding to this NUTAB from filtered list or all tables
              const allTabelas = await OfflineDataService.getTabelasPrecos();
              const targetTable = allTabelas.find((t: any) => Number(t.NUTAB) === Number(melhorPolitica.RESULT_NUTAB));

              if (targetTable) {
                codTabFinal = String(targetTable.CODTAB !== undefined ? targetTable.CODTAB : '');
                console.log('🎯 [MixIA] Tabela final ajustada pela política:', codTabFinal);
              }
            } else {
              if (tabelasFiltradasParaProduto.length === 0) {
                console.warn('⚠️ Nenhuma política atendeu aos critérios do contexto ou não definiu tabela/markup.');
              }
            }
          } else {
            console.warn('⚠️ Nenhuma política comercial encontrada.');
            setTabelasPrecosConfigModal(tabelasPrecos); // Fallback
            setMaxDescontoPolitica(undefined);
            setMaxAcrescimoPolitica(undefined);
          }
        } catch (errPolicy) {
          console.error('Erro ao resolver política no MixIA:', errPolicy);
          setTabelasPrecosConfigModal(tabelasPrecos); // Fallback em erro
          setMaxDescontoPolitica(undefined);
          setMaxAcrescimoPolitica(undefined);
        } finally {
          console.groupEnd();
        }
      } else {
        setTabelasPrecosConfigModal(tabelasPrecos); // Fallback sem contexto
        setMaxDescontoPolitica(undefined);
        setMaxAcrescimoPolitica(undefined);
      }

      let precoInicial = 0
      let tabelaInicial = 'PADRAO'
      let nutabInicial: number | undefined = undefined

      if (codTabFinal) {
        const precos = await OfflineDataService.getPrecos(Number(produto.CODPROD))
        // Tentar encontrar o preço para o CODTAB selecionado
        const tabela = tabelasPrecosConfigModal.find(t => String(t.CODTAB) === String(codTabFinal))

        if (tabela && tabela.NUTAB) {
          const precoEncontrado = precos.find(p => Number(p.NUTAB) === Number(tabela.NUTAB))
          if (precoEncontrado && precoEncontrado.VLRVENDA) {
            precoInicial = parseFloat(String(precoEncontrado.VLRVENDA).replace(/,/g, '.'))
            tabelaInicial = String(tabela.CODTAB)
            nutabInicial = Number(tabela.NUTAB)
            console.log(`✅ Preço inicial definido por CODTAB ${codTabFinal} (NUTAB ${tabela.NUTAB}):`, precoInicial)
          }
        }
      }

      // Se não encontrou preço, tenta o preço base do histórico
      if (precoInicial === 0) {
        precoInicial = produto.VLRUNIT || (produto.valorTotal / produto.qtdComprada) || 0
      }

      const volumes = await fetch(`/api/sankhya/produtos/volumes?codProd=${produto.CODPROD}`).then(res => res.ok ? res.json() : [])
      const unidades: UnidadeVolume[] = [
        {
          CODVOL: produto.UNIDADE || 'UN',
          DESCRICAO: `${produto.UNIDADE || 'UN'} - Unidade Padrão`,
          QUANTIDADE: 1,
          isPadrao: true
        },
        ...volumes.filter((v: any) => v.ATIVO === 'S').map((v: any) => ({
          CODVOL: v.CODVOL,
          DESCRICAO: v.DESCRDANFE || v.CODVOL,
          QUANTIDADE: v.QUANTIDADE || 1,
          isPadrao: false
        }))
      ]

      setUnidadesProdutoConfig(unidades)
      setProdutoSelecionado(produto)
      setConfigProdutoInicial({
        quantidade: 1,
        desconto: 0,
        preco: precoInicial,
        unidade: produto.UNIDADE || produto.CODVOL || 'UN',
        tabelaPreco: tabelaInicial,
        nutab: nutabInicial,
        precoBase: precoInicial
      })
      setShowConfigModal(true)
    } catch (error) {
      console.error('Erro ao abrir configuração:', error)
      toast.error('Erro ao carregar dados do produto')
    } finally {
      setLoading(false)
    }
  }

  const handleVerPrecos = () => {
    if (onVerPrecos) {
      onVerPrecos()
    } else {
      toast.info("Funcionalidade de troca de tabela disponível no Catálogo Principal")
    }
  }

  const abrirDetalhes = (produto: any) => {
    setProdutoDetalhes(produto)
    setShowDetalhesModal(true)
  }

  const confirmarInclusao = (config: ConfiguracaoProduto) => {
    if (!produtoSelecionado) return

    const vlrSubtotal = config.preco * config.quantidade
    const vlrTotal = vlrSubtotal * (1 - config.desconto / 100)
    const vlrDesconto = vlrSubtotal - vlrTotal

    onAdicionarItem({
      ...produtoSelecionado,
      CODPROD: String(produtoSelecionado.CODPROD),
      DESCRPROD: produtoSelecionado.DESCRPROD,
      CODVOL: config.unidade,
      UNIDADE: config.unidade,
      VLRUNIT: config.preco,
      preco: config.preco,
      VLRTOT: vlrTotal,
      VLRDESC: vlrDesconto,
      PERCDESC: config.desconto,
      QTDNEG: config.quantidade,
      CONTROLE: config.controle || ' ',
      TABELA_PRECO: config.tabelaPreco || 'PADRAO',
      MARCA: produtoSelecionado.MARCA,
      MAX_DESC_PERMITIDO: maxDescontoPolitica,
      MAX_ACRE_PERMITIDO: maxAcrescimoPolitica
    }, config.quantidade, config.desconto, config.tabelaPreco)

    toast.success("Produto adicionado ao carrinho", {
      description: `${produtoSelecionado.DESCRPROD} - ${config.quantidade} ${config.unidade}`
    })

    setShowConfigModal(false)
  }

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor)
  }

  if (!codParc || codParc === "0") {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center p-4">
        <AlertCircle className="w-12 h-12 text-yellow-500 mb-4" />
        <h3 className="text-lg font-semibold text-gray-700">Parceiro não selecionado</h3>
        <p className="text-sm text-gray-500 mt-2">
          Selecione um parceiro na aba "Cabeçalho" para ver as sugestões de produtos baseadas no histórico de compras.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-green-600" />
              <CardTitle className="text-base text-green-800">IA Mix de Produtos</CardTitle>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={buscarMixProdutos}
              disabled={loading || !isOnline}
              className="border-green-300 text-green-700 hover:bg-green-100 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              {isOnline ? 'Atualizar' : 'Offline'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <p className="text-xs text-green-700">
            Sugestões baseadas nas compras de <strong>{nomeParceiro || `Parceiro ${codParc}`}</strong> nos últimos 3 meses.
          </p>
          {resumo && (
            <div className="flex gap-4 mt-2 text-xs text-green-600">
              <span>{resumo.totalNotas} notas</span>
              <span>{resumo.produtosUnicos} produtos</span>
              <span>{resumo.periodo}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm text-gray-500">Analisando histórico de compras...</p>
        </div>
      ) : !isOnline ? (
        <div className="flex flex-col items-center justify-center h-48 text-center p-6 bg-amber-50 rounded-lg border border-amber-200">
          <WifiOff className="w-10 h-10 text-amber-500 mb-3" />
          <h4 className="text-sm font-bold text-amber-900">IA Indisponível Offline</h4>
          <p className="text-xs text-amber-700 mt-1">
            O Mix de Produtos IA requer conexão com a internet para analisar o histórico em tempo real.
          </p>
        </div>
      ) : erro ? (
        <div className="flex flex-col items-center justify-center h-48 text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
          <p className="text-sm text-red-600">{erro}</p>
          <Button variant="outline" size="sm" onClick={buscarMixProdutos} className="mt-3">
            Tentar novamente
          </Button>
        </div>
      ) : sugestoes.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-center">
          <Package className="w-10 h-10 text-gray-400 mb-3" />
          <p className="text-sm text-gray-500">Nenhum histórico de compras encontrado</p>
          <p className="text-xs text-gray-400 mt-1">Este cliente não possui compras nos últimos 3 meses</p>
        </div>
      ) : (
        <ScrollArea className="h-[calc(100vh-400px)]">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-1">
            {sugestoes.map((produto) => {
              const jaNoCarrinho = itensCarrinho.some(item => String(item.CODPROD) === String(produto.CODPROD))
              const imagemUrl = produtoImagens[produto.CODPROD]

              return (
                <Card
                  key={produto.CODPROD}
                  className={`relative overflow-hidden transition-all ${jaNoCarrinho ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-green-300 hover:shadow-md'}`}
                >
                  <CardContent className="p-3">
                    <div className="flex gap-3">
                      <div className="w-16 h-16 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                        {imagemUrl ? (
                          <img
                            src={imagemUrl}
                            alt={produto.DESCRPROD}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="w-8 h-8 text-gray-400" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-medium text-gray-800 line-clamp-2 leading-tight">
                          {produto.DESCRPROD}
                        </h4>

                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            {produto.qtdComprada} un
                          </Badge>
                          <span className="text-[10px] text-gray-500">
                            {produto.vezes}x comprado
                          </span>
                        </div>

                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-1">
                            <TrendingUp className="w-3 h-3 text-green-600" />
                            <span className="text-xs font-semibold text-green-700">
                              {formatarMoeda(produto.valorTotal / produto.qtdComprada)}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => abrirDetalhes(produto)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>

                            <Button
                              size="sm"
                              onClick={() => abrirConfiguracao(produto)}
                              disabled={jaNoCarrinho}
                              className={`h-8 px-3 text-xs ${jaNoCarrinho ? 'bg-green-600' : 'bg-green-600 hover:bg-green-700'}`}
                            >
                              {jaNoCarrinho ? (
                                <>
                                  <ShoppingCart className="w-3 h-3 mr-1" />
                                  No carrinho
                                </>
                              ) : (
                                <>
                                  <Plus className="w-3 h-3 mr-1" />
                                  Selecionar
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </ScrollArea>
      )}

      <ConfiguracaoProdutoModal
        open={showConfigModal}
        onOpenChange={setShowConfigModal}
        produto={produtoSelecionado}
        imagemUrl={produtoSelecionado ? produtoImagens[produtoSelecionado.CODPROD] : null}
        unidades={unidadesProdutoConfig}
        tabelasPrecos={tabelasPrecosConfigModal}
        configInicial={configProdutoInicial}
        maxDesconto={maxDescontoPolitica}
        maxAcrescimo={maxAcrescimoPolitica}
        onConfirmar={confirmarInclusao}
        onVerPrecos={handleVerPrecos}
        onTabelaPrecoChange={handleTabelaPrecoChange}
        modo="adicionar"
      />

      {produtoDetalhes && (
        <ProdutoDetalhesModal
          isOpen={showDetalhesModal}
          onClose={() => {
            setShowDetalhesModal(false)
            setProdutoDetalhes(null)
          }}
          produto={produtoDetalhes}
        />
      )}
    </div>
  )
}
