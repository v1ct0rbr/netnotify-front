import api from "@/config/axios"
import { useAuthStore } from "@/store/useAuthStore"
import { GalleryVerticalEnd } from "lucide-react"
import React from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { KeycloakServerAuth } from "./components/KeycloakServerAuth"

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { checkAuth } = useAuthStore()
  const [processing, setProcessing] = React.useState(false)

  // decode JWT payload safely (for optional exp validation)
  const parseJwt = (token: string) => {
    try {
      const base64Url = token.split(".")[1]
      if (!base64Url) return null
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/")
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      )
      return JSON.parse(jsonPayload)
    } catch {
      return null
    }
  }

  // process auth via URL: ?token=<jwt>[&redirect=/rota]
  React.useEffect(() => {
    const search = new URLSearchParams(location.search)
    const token = search.get("token")
    const redirectTo = search.get("redirect") || "/"

    if (!token) return

    // basic JWT format check
    const isJwt = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(token)
    if (!isJwt) {
      toast.error("Token inválido.")
      return
    }

    setProcessing(true)
    ;(async () => {
      try {
        // optional: validate exp if present
        const payload = parseJwt(token)
        const exp = payload?.exp ? Number(payload.exp) : undefined
        if (exp && Date.now() >= exp * 1000) {
          toast.error("Token expirado.")
          setProcessing(false)
          return
        }

        // persist token to localStorage
        localStorage.setItem("token", token)

        // set default Authorization header
        api.defaults.headers.common["Authorization"] = `Bearer ${token}`

        // validate token and fetch user profile
        const ok = await checkAuth()
        if (!ok) {
          toast.error("Falha ao validar token.")
          localStorage.removeItem("token")
          setProcessing(false)
          return
        }

        toast.success("Autenticado com sucesso!")

        // navigate and clean query params
        navigate(redirectTo, { replace: true })
      } catch (e) {
        console.error("Auth via URL error:", e)
        toast.error("Falha na autenticação via URL.")
        localStorage.removeItem("token")
        setProcessing(false)
      }
    })()
  }, [location.search, navigate, checkAuth])

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <a href="/" className="flex items-center gap-2 font-medium">
            <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
              <GalleryVerticalEnd className="size-4" />
            </div>
            NetNotify
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full ">
            {processing ? (
              <div className="text-center text-muted py-8">
                <div className="spinner mb-2"></div>
                Autenticando via token...
              </div>
            ) : (
              <KeycloakServerAuth />
            )}
          </div>
        </div>
      </div>
      <div className="bg-muted relative hidden lg:block">
        <img
          src="/notifications_background.png"
          alt="Image"
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
        />
      </div>
    </div>
  )
}