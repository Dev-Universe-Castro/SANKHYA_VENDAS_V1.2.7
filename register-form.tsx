"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import Image from "next/image"
import { Loader2 } from "lucide-react"

export default function RegisterForm() {
  const router = useRouter()
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'name') setName(value);
    else if (name === 'email') setEmail(value);
    else if (name === 'password') setPassword(value);
    else if (name === 'confirmPassword') setConfirmPassword(value);
    setError("");
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("As senhas não coincidem")
      return
    }

    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres")
      return
    }

    setIsSubmitting(true)

    const payload = {
      idEmpresa: 1,
      nome: name,
      email: email,
      senha: password,
      funcao: 'Vendedor'
    };

    try {
      const response = await fetch('/api/usuarios/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao realizar cadastro')
      }

      alert("Cadastro realizado com sucesso! Aguarde a aprovação do administrador para fazer login.")
      router.push("/")
    } catch (err: any) {
      setError(err.message || "Erro ao realizar cadastro. Tente novamente.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex bg-white flex-col lg:flex-row-reverse font-sans">
      {/* Esquerda (Na visualização Reverse, fica do lado direito visualmente): Branding & Identidade visual */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#1E5128] flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-[#76BA1B]/20 to-transparent z-0 pointer-events-none" />
        <div className="absolute -top-[20%] -left-[20%] w-[70%] h-[70%] rounded-full bg-[#76BA1B]/20 blur-[120px] z-0 pointer-events-none" />

        <div className="flex-1 flex flex-col justify-center relative z-10 w-full pt-16">
          <div className="max-w-lg mx-auto w-full flex flex-col items-center">
            <div className="flex justify-center w-full mb-6 relative">
              <Image
                src="/Logo_Final.png"
                alt="PredictSales Logo"
                width={160}
                height={48}
                className="object-contain"
                priority
              />
            </div>

            <div className="text-white space-y-4 w-full">
              <h1 className="text-3xl xl:text-4xl font-bold tracking-tight font-montserrat leading-snug text-center drop-shadow-sm">
                Junte-se à revolução em vendas preditivas.
              </h1>
              <p className="text-base xl:text-lg text-[#F2F2F2]/90 font-light leading-relaxed text-center max-w-md mx-auto">
                Solicite seu acesso e descubra como a inteligência artificial pode transformar os resultados da sua equipe.
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-sm text-[#F2F2F2]/60 font-medium text-center lg:text-left">
          &copy; {new Date().getFullYear()} PredictSales. Todos os direitos reservados.
        </div>
      </div>

      {/* Direita (Visualmente esquerda): Formulário Clean Card */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative bg-white">
        <div className="w-full max-w-md bg-white p-8 sm:p-10 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] sm:border sm:border-gray-100 flex flex-col justify-center min-h-[500px]">

          <div className="space-y-3 mb-8 text-center sm:text-left">
            <div className="lg:hidden flex justify-center mb-8">
              <Image
                src="/Logo_Final.png"
                alt="PredictSales Logo"
                width={160}
                height={50}
                className="object-contain"
                priority
              />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#121212] font-montserrat tracking-tight">Criar uma conta</h2>
            <p className="text-[#121212]/60 text-sm">Preencha seus dados para solicitar acesso.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-semibold text-[#1E5128] uppercase tracking-wider">Nome Completo</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="Seu nome"
                value={name}
                onChange={handleChange}
                required
                className="h-11 bg-[#F2F2F2] border-transparent focus-visible:ring-[#76BA1B]/30 focus-visible:border-[#76BA1B] rounded-xl transition-all text-[#121212]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold text-[#1E5128] uppercase tracking-wider">Email Corporativo</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="nome@empresa.com.br"
                value={email}
                onChange={handleChange}
                required
                className="h-11 bg-[#F2F2F2] border-transparent focus-visible:ring-[#76BA1B]/30 focus-visible:border-[#76BA1B] rounded-xl transition-all text-[#121212]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-semibold text-[#1E5128] uppercase tracking-wider">Senha</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={handleChange}
                  required
                  className="h-11 bg-[#F2F2F2] border-transparent focus-visible:ring-[#76BA1B]/30 focus-visible:border-[#76BA1B] rounded-xl transition-all text-[#121212]"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-xs font-semibold text-[#1E5128] uppercase tracking-wider">Confirmar</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={handleChange}
                  required
                  className="h-11 bg-[#F2F2F2] border-transparent focus-visible:ring-[#76BA1B]/30 focus-visible:border-[#76BA1B] rounded-xl transition-all text-[#121212]"
                />
              </div>
            </div>

            {error && <p className="text-sm text-red-500 font-medium py-1">{error}</p>}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 mt-6 bg-[#76BA1B] hover:bg-[#1E5128] text-white font-bold font-montserrat rounded-xl shadow-lg shadow-[#76BA1B]/20 transition-all hover:shadow-[#1E5128]/30 active:scale-[0.98] flex items-center justify-center gap-2 text-base"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Solicitando...
                </>
              ) : (
                "Solicitar Acesso"
              )}
            </Button>
          </form>

          <div className="mt-8 text-center text-sm font-medium">
            <span className="text-gray-500">Já tem uma conta? </span>
            <Link href="/" className="text-[#2ECC71] hover:text-[#27ae60] transition-colors">
              Fazer login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}