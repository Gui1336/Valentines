import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

// Substitua estas variáveis com suas credenciais do Supabase
const supabaseUrl = 'https://jgocneuqrkmsmkyksfuw.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impnb2NuZXVxcmttc21reWtzZnV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2MTg3NTEsImV4cCI6MjA2NTE5NDc1MX0.QhoUjGg3Dp6ldKzJ80VeNiZcEz17MA6VxbJ00cGETlE'

// Verificar se as credenciais estão configuradas
if (!supabaseUrl || !supabaseKey) {
    console.error('Credenciais do Supabase não configuradas!');
    alert('Erro de configuração: Credenciais do Supabase não encontradas.');
}

export const supabase = createClient(supabaseUrl, supabaseKey)

// Exportar a chave para uso no upload de imagens
export { supabaseKey }

// Verificar conexão com o Supabase
async function checkConnection() {
    try {
        console.log('Verificando conexão com o Supabase...');
        console.log('URL:', supabaseUrl);

        // Verificar conexão com o banco
        const { data: dbData, error: dbError } = await supabase
            .from('moments')
            .select('count')
            .limit(1)

        if (dbError) {
            console.error('Erro na conexão com o banco:', dbError)
            return false
        }

        console.log('Conexão com o Supabase estabelecida com sucesso')
        return true
    } catch (error) {
        console.error('Erro ao verificar conexão:', error)
        return false
    }
}

// Verificar conexão ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    checkConnection().then(success => {
        if (!success) {
            console.error('Falha na conexão com o Supabase')
            alert('Erro de conexão: Não foi possível conectar ao banco de dados do Supabase.');
        }
    })
})