import api from "@/config/axios";

export type UploadResult = {
    url: string;
};

/**
 * Envia uma imagem para o servidor e retorna a URL pública acessível.
 * Os agentes baixam essa URL e embutem como data URI ao exibir a mensagem.
 */
export async function uploadImage(file: File | Blob, filename: string): Promise<UploadResult> {
    const formData = new FormData();
    formData.append('file', file, filename);

    // Importante: não definir Content-Type manualmente. Ao passar 'undefined',
    // o navegador monta o cabeçalho correto com o boundary do multipart/form-data.
    const response = await api.post('/upload/image', formData, {
        headers: { 'Content-Type': undefined },
    });

    const data = response.data;
    if (data?.status !== 'SUCCESS') {
        throw new Error(data?.message || 'Erro ao enviar a imagem.');
    }
    return { url: data.object as string };
}
