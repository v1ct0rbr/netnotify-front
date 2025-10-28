import { GalleryVerticalEnd } from "lucide-react"
import React from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { toast } from "sonner"
import api from "@/config/axios"
import { useAuthStore } from "@/store/useAuthStore"
import { LoginForm } from "./components/LoginForm"
import { useKeycloak } from "@/hooks/useKeycloak"
import { useKeycloakCodeExchange } from "@/hooks/useKeycloakCodeExchange"

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { checkAuth } = useAuthStore()
  const { keycloak, isAuthenticated } = useKeycloak()
  const [processing, setProcessing] = React.useState(false)

  // Processa o authorization code do Keycloak
  useKeycloakCodeExchange()

  // decode JWT payload safely
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

  // if already authenticated via Keycloak, redirect
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate("/", { replace: true })
    }
  }, [isAuthenticated, navigate])

  // process auth via URL: ?token=<jwt>[&redirect=/rota]
  React.useEffect(() => {
    const search = new URLSearchParams(location.search)
    const token = search.get("token")
    const redirectTo = search.get("redirect") || "/"

    if (!token) return

    const isJwt = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(token)
    if (!isJwt) {
      toast.error("Token inválido.")
      return
    }

    setProcessing(true)
    ;(async () => {
      try {
        const payload = parseJwt(token)
        const exp = payload?.exp ? Number(payload.exp) : undefined
        if (exp && Date.now() >= exp * 1000) {
          toast.error("Token expirado.")
          setProcessing(false)
          return
        }

        localStorage.setItem("token", token)
        api.defaults.headers.common["Authorization"] = `Bearer ${token}`

        const ok = await checkAuth()
        if (!ok) {
          toast.error("Falha ao validar token.")
          localStorage.removeItem("token")
          setProcessing(false)
          return
        }

        toast.success("Autenticado com sucesso!")
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
          <div className="w-full">
            {processing ? (
              <div className="text-center text-muted py-8">
                <div className="mb-2">Autenticando via token...</div>
              </div>
            ) : (
              <LoginForm />
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