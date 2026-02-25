
"use client"

import DashboardLayout from "@/components/dashboard-layout"
import PedidosFDVTable from "@/components/pedidos-fdv-table"
import PedidosSyncMonitor from "@/components/pedidos-sync-monitor"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RouteGuard } from "@/components/route-guard"

export default function PedidosPage() {
  return (
    <RouteGuard requiredScreen="telaPedidosVendas">
      <DashboardLayout hideFloatingMenu={true}>
        <div className="flex flex-col h-full bg-transparent overflow-hidden scrollbar-hide">
          {/* Header - Desktop */}
          <div className="hidden md:block p-6 bg-transparent">
            <h1 className="text-3xl font-bold tracking-tight text-[#1E5128]">Pedidos de Vendas</h1>
            <p className="text-[#1E5128]/70 mt-1">
              Histórico e controle de pedidos criados pelo sistema
            </p>
          </div>

          {/* Header - Mobile */}
          <div className="md:hidden px-4 py-4 bg-transparent border-b border-black/5">
            <h1 className="text-xl font-bold text-[#1E5128]">Pedidos de Vendas</h1>
            <p className="text-sm text-[#1E5128]/70 mt-1">
              Histórico e controle de pedidos
            </p>
          </div>

          <Tabs defaultValue="fdv" className="flex-1 flex flex-col overflow-hidden">
            <div className="px-4 md:px-6 py-2">
              <TabsList className="grid w-full md:w-[400px] grid-cols-2 h-11 p-1 bg-white border border-[#F2F2F2] rounded-full shadow-sm">
                <TabsTrigger value="fdv" className="text-xs sm:text-sm font-semibold transition-all rounded-full data-[state=active]:bg-[#76BA1B] data-[state=active]:text-white data-[state=active]:shadow-md">
                  <span className="hidden sm:inline">Pedidos FDV</span>
                  <span className="sm:hidden">PEDIDOS</span>
                </TabsTrigger>
                <TabsTrigger value="sincronizador" className="text-xs sm:text-sm font-semibold transition-all rounded-full data-[state=active]:bg-[#76BA1B] data-[state=active]:text-white data-[state=active]:shadow-md">
                  <span className="hidden sm:inline">Sincronizador</span>
                  <span className="sm:hidden">SYNC</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="fdv" className="flex-1 overflow-hidden m-0">
              <PedidosFDVTable />
            </TabsContent>

            <TabsContent value="sincronizador" className="flex-1 overflow-hidden m-0">
              <PedidosSyncMonitor />
            </TabsContent>
          </Tabs>
        </div>
      </DashboardLayout>
    </RouteGuard>
  )
}
