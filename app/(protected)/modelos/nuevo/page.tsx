import { ModeloForm } from "@/components/modelos/modelo-form"

export default function NuevoModeloPage() {
  return <div className="w-full space-y-3"><ModeloForm redirectOnSaved="/modelos" cancelHref="/modelos" /></div>
}
