import { Lock } from "lucide-react";

export function KeycloakServerAuth() {
    const authUrl = `${import.meta.env.VITE_KEYCLOAK_AUTH_SERVER_URL}/realms/${import.meta.env.VITE_KEYCLOAK_REALM}/protocol/openid-connect/auth?response_type=code&client_id=${import.meta.env.VITE_KEYCLOAK_CLIENT_ID}&redirect_uri=${encodeURIComponent(
        `${import.meta.env.VITE_KEYCLOAK_URL_REDIRECT}`
    )}&scope=openid`;

    return (
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-lg p-12 max-w-md w-full mx-auto">
                <div className="text-center mb-6">
                    <Lock className="w-16 h-16 text-indigo-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold mb-2 text-fuchsia-900">Login with Keycloak</h2>
                    <p className="text-gray-600">Authenticate using your Keycloak account</p>
                </div>

                <div className="flex justify-center">
                    <a
                        href={authUrl}
                        className="inline-block bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-8 py-3 rounded-full font-semibold uppercase tracking-wide shadow-md transition-transform transform hover:-translate-y-1 hover:shadow-lg"
                    >
                        Login with Keycloak
                    </a>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-100 features">
                    <div className="space-y-2">
                        <div className="flex items-center text-gray-600 feature-item">
                            <span className="mr-3 text-indigo-500 feature-icon">•</span>
                            <span>Secure single sign-on</span>
                        </div>
                        <div className="flex items-center text-gray-600 feature-item">
                            <span className="mr-3 text-indigo-500 feature-icon">•</span>
                            <span>OpenID Connect support</span>
                        </div>
                    </div>
                </div>

                <div className="text-center mt-6 pt-3 border-t border-blue-100">
                    <small className="text-gray-500">
                        &copy; 2024 NetNotify. All rights reserved.
                        <br />
                        Desenvolvido por Victor Queiroga - DERPB
                    </small>
                </div>
            </div>
        
    );
}
