// Contrato arquitectónico ejecutable. Evita archivos gigantes, tipografía
// mínima o dependencias prohibidas entre capas.
import { readFile, readdir } from "node:fs/promises"
import { extname, join, relative } from "node:path"

const root = process.cwd()
const sourceRoots = ["app", "components", "features", "hooks", "lib"]
const allowedLargeFiles = new Map([
  ["components/ui/sidebar.tsx", 725],
])
const allowedAuthClientConsumers = new Set([
  "app/login/page.tsx",
  "components/auth/auth-provider.tsx",
])
const violations = []

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await walk(path))
    else if ([".ts", ".tsx"].includes(extname(entry.name))) files.push(path)
  }
  return files
}

for (const sourceRoot of sourceRoots) {
  for (const path of await walk(join(root, sourceRoot))) {
    const name = relative(root, path).replaceAll("\\", "/")
    const source = await readFile(path, "utf8")
    const lines = source.split(/\r?\n/).length
    const limit = allowedLargeFiles.get(name) ?? 700
    if (lines > limit) violations.push(`${name}: ${lines} líneas; límite ${limit}`)
    if (/text-\[(?:[1-9]|1[01])px\]/.test(source)) {
      violations.push(`${name}: la tipografía visible no puede ser menor de 12 px`)
    }

    const isComponent = name.startsWith("app/") || name.startsWith("components/") || name.startsWith("features/")
    if (
      isComponent
      && !name.includes("/repositories/")
      && !allowedAuthClientConsumers.has(name)
      && /from\s+["']@\/lib\/supabase["']/.test(source)
    ) {
      violations.push(`${name}: los componentes no pueden importar el cliente Supabase`)
    }

    if (
      name.includes("/domain/")
      && (
        /from\s+["']react/.test(source)
        || /from\s+["']@supabase/.test(source)
        || /from\s+["']@\/lib\/supabase["']/.test(source)
      )
    ) {
      violations.push(`${name}: el dominio debe ser puro y no importar React/Supabase`)
    }

    if (source.includes("@/lib/supabase-data")) {
      violations.push(`${name}: la fachada central supabase-data fue retirada; usa un repositorio de dominio`)
    }

    if (
      name.startsWith("components/dashboard/")
      && (
        source.includes("EXECUTIVE_SCORE")
        || /(?:60\s*[-–]\s*84|(?:>=|≥)\s*85|(?:<|≤)\s*60)\s*%?/.test(source)
      )
    ) {
      violations.push(`${name}: los rangos de calidad deben provenir de Ajustes > Umbrales`)
    }
  }
}

if (violations.length) {
  console.error(`Violaciones arquitectónicas:\n- ${violations.join("\n- ")}`)
  process.exit(1)
}
console.log("Arquitectura dentro de los límites definidos.")
