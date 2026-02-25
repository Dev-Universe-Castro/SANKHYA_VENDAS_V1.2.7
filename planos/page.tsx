"use client";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, HelpCircle, ChevronDown, Check } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function PlanosPage() {
    const [isAnnual, setIsAnnual] = useState(true);
    const [openFaq, setOpenFaq] = useState<number | null>(0);

    const fadeInUp = {
        hidden: { opacity: 0, y: 30 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
    };

    const faqs = [
        {
            q: "O sistema funciona em iPhones (iOS) ou apenas em Android?",
            a: "O Predict é um PWA (Progressive Web App) híbrido avançado, construído com as linguagens de ponta do mercado. Ele funciona perfeitamente tanto no ecossistema Android da Samsung/Motorola quanto nos iPhones da Apple. Não existem restrições de dispositivo."
        },
        {
            q: "O que acontece se meu vendedor perder o celular em uma região sem internet?",
            a: "O aplicativo possui proteção biométrica. O banco local (SQLite) onde os dados do Sankhya e as senhas encontram-se gravados é criptografado com chaves AES-256 bits via JWT. Nenhuma informação de margem de lucro, custo, ou faturamento dos clientes será acessível a terceiros."
        },
        {
            q: "Em quanto tempo o sistema Predict é implantado no meu distribuidor?",
            a: "Entre 7 a 14 dias úteis se a sua base do Sankhya estiver organizada. Nós instalamos a API bridge no servidor, validamos as visões e integramos o AD_CONTRATO automaticamente."
        },
        {
            q: "Tem limite de produtos, fotos ou clientes sincronizados no Offline?",
            a: "Não. O banco local suporta até dezenas de milhões de registros e mais de 2GB de cache de imagens sem engasgar o celular graças a nossa engine em Rust/WASM."
        }
    ];

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-900 flex flex-col overflow-x-hidden">
            <SiteHeader />

            <main className="flex-1 mt-20">

                {/* PRICING HEADER */}
                <section className="pt-24 pb-16 bg-white border-b border-gray-100 text-center relative overflow-hidden">
                    <div className="absolute top-0 right-1/2 translate-x-1/2 w-[40rem] h-[40rem] bg-gradient-to-b from-[#76BA1B]/10 to-transparent rounded-full blur-[100px] pointer-events-none"></div>

                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                        <motion.div initial="hidden" animate="visible" variants={fadeInUp}>
                            <h1 className="text-4xl md:text-6xl font-black font-montserrat mb-6 tracking-tight text-[#1E5128]">
                                Preços Transparentes,<br />Sem Taxas de Implementação
                            </h1>
                            <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto font-light">
                                Escolha o plano ideal para a sua força de vendas. Diferente das concorrentes, nós não cobramos 'setup' obscuro de milhares de reais que demora meses.
                            </p>

                            {/* Toggle Anual/Mensal */}
                            <div className="flex items-center justify-center gap-4 mb-8">
                                <span className={`text-sm font-bold ${!isAnnual ? 'text-gray-900' : 'text-gray-400'}`}>Mensal</span>
                                <button
                                    onClick={() => setIsAnnual(!isAnnual)}
                                    className="w-16 h-8 bg-[#1E5128] rounded-full relative p-1 transition-colors"
                                >
                                    <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${isAnnual ? 'translate-x-8' : 'translate-x-0'}`}></div>
                                </button>
                                <span className={`text-sm font-bold flex items-center gap-2 ${isAnnual ? 'text-gray-900' : 'text-gray-400'}`}>
                                    Anual <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full uppercase tracking-wider">Economize 20%</span>
                                </span>
                            </div>
                        </motion.div>
                    </div>
                </section>

                {/* PRICING CARDS */}
                <section className="py-8 bg-gray-50">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto relative z-20 -mt-16">

                            {/* Plano 1 */}
                            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="bg-white rounded-[2.5rem] p-8 border border-gray-200 shadow-xl flex flex-col">
                                <h4 className="text-2xl font-bold text-gray-900 mb-2">Starter</h4>
                                <p className="text-sm text-gray-500 mb-8 border-b border-gray-100 pb-6">Para pequenos distribuidores validando o digital.</p>
                                <div className="mb-8">
                                    <span className="text-5xl font-black text-[#1E5128]">R$ {isAnnual ? '89' : '109'}</span>
                                    <span className="text-gray-400 font-medium">/usr/mês</span>
                                </div>
                                <ul className="space-y-4 mb-10 flex-1">
                                    <li className="flex gap-3 text-gray-600 text-sm"><Check className="h-5 w-5 text-[#76BA1B] flex-shrink-0" /> Integração 100% com Sankhya (Tabelas e Vendedores)</li>
                                    <li className="flex gap-3 text-gray-600 text-sm"><Check className="h-5 w-5 text-[#76BA1B] flex-shrink-0" /> Funciona Offline e Online</li>
                                    <li className="flex gap-3 text-gray-600 text-sm"><Check className="h-5 w-5 text-[#76BA1B] flex-shrink-0" /> Catálogo de Produtos Limitado (Até 5 mil SKU)</li>
                                    <li className="flex gap-3 text-gray-400 text-sm opacity-60"><XCircle className="h-5 w-5 flex-shrink-0" /> Sem CRM Completo e Rotas</li>
                                    <li className="flex gap-3 text-gray-400 text-sm opacity-60"><XCircle className="h-5 w-5 flex-shrink-0" /> Sem Inteligência Artificial</li>
                                </ul>
                                <Button variant="outline" className="w-full text-base py-6 rounded-2xl border-2 border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all font-bold">Instalar Starter</Button>
                            </motion.div>

                            {/* Plano 2 */}
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0 }} className="bg-[#1E5128] rounded-[2.5rem] p-8 shadow-[0_20px_50px_rgba(30,81,40,0.3)] flex flex-col relative transform md:-translate-y-8 border-4 border-[#76BA1B]/20">
                                <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-[#76BA1B] to-green-400 text-black text-xs font-black px-6 py-2 rounded-full uppercase tracking-widest shadow-lg">
                                    Recomendado
                                </div>
                                <h4 className="text-2xl font-bold text-white mb-2">Professional</h4>
                                <p className="text-sm text-white/70 mb-8 border-b border-white/10 pb-6">Tudo ativado para aumentar conversão.</p>
                                <div className="mb-8">
                                    <span className="text-5xl font-black text-white">R$ {isAnnual ? '149' : '179'}</span>
                                    <span className="text-white/60 font-medium">/usr/mês</span>
                                </div>
                                <ul className="space-y-4 mb-10 flex-1">
                                    <li className="flex gap-3 text-white text-sm"><Check className="h-5 w-5 text-[#76BA1B] flex-shrink-0" /> Tudo do Starter</li>
                                    <li className="flex gap-3 text-white text-sm"><Check className="h-5 w-5 text-[#76BA1B] flex-shrink-0" /> CRM 360 e Títulos Financeiros em Aberto</li>
                                    <li className="flex gap-3 text-white text-sm"><Check className="h-5 w-5 text-[#76BA1B] flex-shrink-0" /> Agenda, Check-in/Check-out GPS Georreferenciado</li>
                                    <li className="flex gap-3 text-white text-sm"><Check className="h-5 w-5 text-[#76BA1B] flex-shrink-0" /> Hierarquia e Workflows de Descontos</li>
                                    <li className="flex gap-3 text-white/50 text-sm opacity-60"><XCircle className="h-5 w-5 flex-shrink-0" /> Sem Inteligência Artificial</li>
                                </ul>
                                <Button className="w-full text-base py-6 rounded-2xl bg-[#76BA1B] hover:bg-[#65A017] text-black shadow-lg shadow-[#76BA1B]/10 font-bold">Começar Teste Grátis de 14 dias</Button>
                            </motion.div>

                            {/* Plano 3 */}
                            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="bg-gray-900 rounded-[2.5rem] p-8 border border-gray-800 shadow-xl flex flex-col">
                                <h4 className="text-2xl font-bold text-white mb-2">Enterprise AI</h4>
                                <p className="text-sm text-gray-400 mb-8 border-b border-gray-800 pb-6">Para quem quer dominar o mercado com dados.</p>
                                <div className="mb-8">
                                    <span className="text-3xl font-black text-white">Contrato Fechado</span>
                                    <div className="text-gray-400 font-medium text-xs mt-2 uppercase tracking-wide">Faturado Anualmente</div>
                                </div>
                                <ul className="space-y-4 mb-10 flex-1">
                                    <li className="flex gap-3 text-gray-300 text-sm"><Check className="h-5 w-5 text-purple-500 flex-shrink-0" /> Tudo do Professional Ilimitado</li>
                                    <li className="flex gap-3 text-gray-300 text-sm"><Check className="h-5 w-5 text-purple-500 flex-shrink-0" /> Predict Sales AI (Carrinho Sugerido, Previsão de Churn e Giro)</li>
                                    <li className="flex gap-3 text-gray-300 text-sm"><Check className="h-5 w-5 text-purple-500 flex-shrink-0" /> AI Analyst (Perguntas em linguagem natural aos dados)</li>
                                    <li className="flex gap-3 text-gray-300 text-sm"><Check className="h-5 w-5 text-purple-500 flex-shrink-0" /> Gerente de Conta Dedicado Integrado SLA VIP</li>
                                </ul>
                                <Button variant="outline" className="w-full text-base py-6 rounded-2xl border-none bg-white text-black hover:bg-gray-100 font-bold">Falar com Especialistas VIP</Button>
                            </motion.div>

                        </div>
                    </div>
                </section>

                {/* COMPARAÇÃO DE RECURSOS BÁSICA */}
                <section className="py-20 bg-gray-50">
                    <div className="max-w-4xl mx-auto px-4 text-center border-t border-gray-200 pt-16">
                        <h3 className="text-2xl font-bold text-gray-600 mb-8 font-montserrat">Tudo o que já está garantido em TODAS as licenças</h3>
                        <div className="flex flex-wrap justify-center gap-4">
                            {["Sincronismo Delta Otimizado", "Criptografia AES-256", "Cálculo de IPI/ST nativo", "Múltiplos Bancos de Preço", "App White-Label (Seu logo)", "Suporte Telefônico no H.C", "Suporte Nuvem Privada"].map((perk, i) => (
                                <span key={i} className="bg-white border border-gray-200 text-sm text-gray-600 px-4 py-2 rounded-full shadow-sm flex items-center">
                                    <CheckCircle2 className="w-4 h-4 text-green-500 mr-2" /> {perk}
                                </span>
                            ))}
                        </div>
                    </div>
                </section>

                {/* FAQ SECTION */}
                <section className="py-24 bg-white border-t border-gray-100">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-16">
                            <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-blue-50 text-sm font-semibold text-blue-700 mb-4">
                                <HelpCircle className="w-4 h-4 mr-2" /> Dúvidas Frequentes
                            </div>
                            <h2 className="text-3xl md:text-4xl font-black font-montserrat">Você Pergunta, Nós Respondemos</h2>
                        </div>

                        <div className="space-y-4">
                            {faqs.map((faq, index) => (
                                <div key={index} className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                                    <button
                                        onClick={() => setOpenFaq(openFaq === index ? null : index)}
                                        className="w-full flex items-center justify-between p-6 bg-white hover:bg-gray-50 transition-colors text-left"
                                    >
                                        <span className="font-bold text-lg text-gray-900 pr-8">{faq.q}</span>
                                        <ChevronDown className={`w-6 h-6 text-gray-400 transition-transform ${openFaq === index ? 'rotate-180 text-[#76BA1B]' : ''}`} />
                                    </button>
                                    <AnimatePresence>
                                        {openFaq === index && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="bg-gray-50 border-t border-gray-100 px-6 overflow-hidden"
                                            >
                                                <p className="py-6 text-gray-600 leading-relaxed text-[15px]">{faq.a}</p>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            ))}
                        </div>

                        <div className="text-center mt-12 bg-[#1E5128]/5 p-8 rounded-3xl border border-[#1E5128]/10">
                            <p className="text-gray-700 mb-4">Ainda tem dúvidas técnicas de como faremos The Fetch Delta nas suas tabelas do Sankhya?</p>
                            <button className="text-[#1E5128] font-bold border-b-2 border-[#1E5128] hover:text-[#76BA1B] hover:border-[#76BA1B] transition-colors pb-1">Agende uma reunião técnica com o CTO</button>
                        </div>
                    </div>
                </section>

            </main>

            <SiteFooter />
        </div>
    );
}
