"use client"

import React, { useState, useEffect } from 'react'
import { Clock, Navigation, CheckCircle2 } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useRouter, usePathname } from 'next/navigation'

export default function FloatingCheckinIndicator() {
  const [visitaAtiva, setVisitaAtiva] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  const fetchVisitaAtiva = async () => {
    try {
      // Busca visitas com status CHECKIN ou EM_ANDAMENTO
      const res = await fetch('/api/rotas/visitas?status=CHECKIN')
      if (res.ok) {
        const data = await res.json()
        if (data && data.length > 0) {
          setVisitaAtiva(data[0])
        } else {
          const res2 = await fetch('/api/rotas/visitas?status=EM_ANDAMENTO')
          if (res2.ok) {
            const data2 = await res2.json()
            setVisitaAtiva(data2 && data2.length > 0 ? data2[0] : null)
          } else {
            setVisitaAtiva(null)
          }
        }
      }
    } catch (error) {
      console.error('Erro ao buscar visita ativa:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVisitaAtiva()
    // Atualiza a cada 30 segundos
    const interval = setInterval(fetchVisitaAtiva, 30000)
    return () => clearInterval(interval)
  }, [pathname])

  if (loading || !visitaAtiva) return null

  // Se já estiver na página de rotas, não precisa do botão flutuante pois o modal já deve estar acessível lá
  // Mas o usuário pediu para abrir o modal. Como o modal está dentro do RotasManager,
  // vamos redirecionar para a página de rotas com um parâmetro para abrir o modal correspondente.
  
  const handleAction = () => {
    router.push('/dashboard/rotas?openAction=checkout')
  }

  return (
    <div className="fixed bottom-24 right-6 z-[100] animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Button
        onClick={handleAction}
        className={cn(
          "h-14 w-14 rounded-full shadow-2xl flex items-center justify-center p-0 overflow-hidden border-4 border-white",
          "bg-green-600 hover:bg-green-700 text-white"
        )}
      >
        <div className="relative w-full h-full flex items-center justify-center">
          <Clock className="w-7 h-7 animate-pulse" />
          <div className="absolute top-0 right-0 h-3 w-3 bg-red-500 rounded-full border-2 border-white animate-bounce" />
        </div>
      </Button>
      <div className="absolute right-16 bottom-2 bg-white px-3 py-1.5 rounded-lg shadow-lg border border-slate-100 whitespace-nowrap pointer-events-none">
        <p className="text-[10px] font-black text-slate-400 uppercase leading-none mb-0.5">Visita em Curso</p>
        <p className="text-xs font-bold text-slate-700">{visitaAtiva.NOMEPARC}</p>
      </div>
    </div>
  )
}
