"use client"

import { Sidebar } from "./sidebar"
import { Header } from "./header"

interface MainLayoutProps {
  children: React.ReactNode
  title: string
  subtitle?: string
}

export function MainLayout({ children, title, subtitle }: MainLayoutProps) {
  return (
    <div className="relative flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="relative flex-1 flex flex-col overflow-hidden">
        <Header title={title} subtitle={subtitle} />
        <main className="flex-1 overflow-auto px-4 py-5 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1520px]">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
