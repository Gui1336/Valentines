import { supabase, supabaseKey } from './supabase.js';

// Elementos do DOM
const timeline = document.querySelector('.timeline');
const addMomentBtn = document.getElementById('addMomentBtn');
const momentModal = document.getElementById('momentModal');
const momentForm = document.getElementById('momentForm');
const cancelBtn = document.getElementById('cancelBtn');

// Verificar se os elementos necessários existem
if (!timeline || !addMomentBtn || !momentModal || !momentForm || !cancelBtn) {
    console.error('Elementos necessários não encontrados no DOM');
    alert('Erro: Alguns elementos necessários não foram encontrados. Por favor, recarregue a página.');
}

// Funções de manipulação do modal
function openModal() {
    console.log('Abrindo modal...');
    momentModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    console.log('Fechando modal...');
    momentModal.style.display = 'none';
    document.body.style.overflow = 'auto';
    momentForm.reset();
}

// Event Listeners
addMomentBtn.addEventListener('click', () => {
    console.log('Botão de adicionar clicado');
    openModal();
});

cancelBtn.addEventListener('click', closeModal);

// Fechar modal ao clicar fora
momentModal.addEventListener('click', (e) => {
    if (e.target === momentModal) {
        closeModal();
    }
});

// Carregar momentos existentes
async function loadMoments() {
    try {
        console.log('Carregando momentos...');
        
        // Adicionar timestamp para evitar cache
        const timestamp = new Date().getTime();
        const { data: moments, error } = await supabase
            .from('moments')
            .select('*')
            .order('date', { ascending: false })
            .throwOnError();

        if (error) {
            console.error('Erro ao carregar momentos:', error);
            throw error;
        }

        console.log('Momentos carregados:', moments);

        // Limpar timeline antes de adicionar os momentos
        timeline.innerHTML = '';

        if (moments && moments.length > 0) {
            // Verificar cada momento individualmente
            for (const moment of moments) {
                // Verificar se o momento ainda existe no banco
                const { data: exists, error: checkError } = await supabase
                    .from('moments')
                    .select('id')
                    .eq('id', moment.id)
                    .single();

                if (checkError) {
                    console.error('Erro ao verificar momento:', checkError);
                    continue;
                }

                if (exists) {
                    addMomentToTimeline(moment);
                }
            }
        } else {
            timeline.innerHTML = '<p class="no-moments">Nenhum momento registrado ainda.</p>';
        }
    } catch (error) {
        console.error('Erro ao carregar momentos:', error);
        timeline.innerHTML = '<p class="error">Erro ao carregar momentos. Por favor, recarregue a página.</p>';
    }
}

// Adicionar momento à timeline
function addMomentToTimeline(moment) {
    const momentElement = document.createElement('div');
    momentElement.className = 'timeline-item';
    
    // Formatar a data
    const date = new Date(moment.date);
    const formattedDate = date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });

    // Determinar o tipo de mídia
    let mediaHtml = '';
    if (moment.image_url) {
        const fileExt = moment.image_url.split('.').pop().toLowerCase();
        if (['mp4', 'webm', 'ogg'].includes(fileExt)) {
            mediaHtml = `
                <video controls class="media-content">
                    <source src="${moment.image_url}" type="video/${fileExt}">
                    Seu navegador não suporta vídeos.
                </video>
            `;
        } else {
            mediaHtml = `<img src="${moment.image_url}" alt="${moment.title}" loading="lazy" class="media-content" onerror="this.onerror=null; this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YwZjBmMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZW0gbmFvIGVuY29udHJhZGE8L3RleHQ+PC9zdmc+';" />`;
        }
    }

    momentElement.innerHTML = `
        <div class="timeline-content">
            <div class="moment-header">
                <h3>${moment.title}</h3>
                <button class="delete-btn" data-id="${moment.id}">
                    <span class="material-icons">delete</span>
                </button>
            </div>
            <p class="date">${formattedDate}</p>
            <p>${moment.description}</p>
            ${mediaHtml}
        </div>
    `;
    
    // Adicionar evento de exclusão
    const deleteBtn = momentElement.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', async () => {
        if (confirm('Tem certeza que deseja excluir este momento?')) {
            try {
                console.log('Iniciando exclusão do momento:', moment.id);

                // Primeiro, excluir do banco de dados usando uma query mais direta
                const { error: deleteError } = await supabase
                    .rpc('delete_moment', { moment_id: moment.id });

                if (deleteError) {
                    console.error('Erro ao excluir do banco:', deleteError);
                    throw new Error(`Erro ao excluir do banco: ${deleteError.message}`);
                }

                console.log('Momento excluído do banco com sucesso');

                // Depois, excluir a mídia se existir
                if (moment.image_url) {
                    const fileName = moment.image_url.split('/').pop();
                    console.log('Excluindo mídia:', fileName);
                    
                    const { error: storageError } = await supabase.storage
                        .from('moments')
                        .remove([fileName]);

                    if (storageError) {
                        console.error('Erro ao excluir mídia:', storageError);
                    } else {
                        console.log('Mídia excluída com sucesso');
                    }
                }

                // Remover elemento da timeline
                momentElement.remove();
                console.log('Elemento removido da timeline');

                // Forçar recarregamento dos momentos
                await loadMoments();

            } catch (error) {
                console.error('Erro ao excluir momento:', error);
                alert(`Erro ao excluir momento: ${error.message}`);
            }
        }
    });
    
    timeline.appendChild(momentElement);
}

// Manipular envio do formulário
momentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('Formulário submetido');

    const formData = new FormData(e.target);
    const momentData = {
        date: formData.get('date'),
        title: formData.get('title'),
        description: formData.get('description')
    };

    // Validação dos campos
    if (!momentData.date || !momentData.title || !momentData.description) {
        alert('Por favor, preencha todos os campos obrigatórios.');
        return;
    }

    console.log('Dados do momento:', momentData);

    try {
        // Upload da mídia primeiro, se existir
        let mediaUrl = null;
        const mediaFile = formData.get('image');
        if (mediaFile && mediaFile.size > 0) {
            console.log('Iniciando upload da mídia:', {
                nome: mediaFile.name,
                tipo: mediaFile.type,
                tamanho: mediaFile.size
            });
            
            try {
                const fileExt = mediaFile.name.split('.').pop().toLowerCase();
                const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

                // Verificar se é um vídeo ou imagem
                const isVideo = ['mp4', 'webm', 'ogg'].includes(fileExt);
                const contentType = isVideo ? `video/${fileExt}` : mediaFile.type;

                console.log('Fazendo upload para:', fileName, 'Tipo:', contentType);
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('moments')
                    .upload(fileName, mediaFile, {
                        cacheControl: '3600',
                        upsert: false,
                        contentType: contentType
                    });

                if (uploadError) {
                    console.error('Erro no upload da mídia:', uploadError);
                    throw new Error(`Erro no upload da mídia: ${uploadError.message}`);
                }

                console.log('Upload da mídia concluído:', uploadData);

                // Obter URL pública
                const { data: { publicUrl } } = supabase.storage
                    .from('moments')
                    .getPublicUrl(fileName);

                console.log('URL pública gerada:', publicUrl);
                mediaUrl = publicUrl;
            } catch (uploadError) {
                console.error('Erro no processo de upload:', uploadError);
                alert(`Erro ao fazer upload da mídia: ${uploadError.message}`);
                return;
            }
        }

        // Depois, salvar o momento no banco com a URL da mídia
        console.log('Salvando momento no banco com URL da mídia:', mediaUrl);
        const { data: savedMoment, error: saveError } = await supabase
            .from('moments')
            .insert([{
                ...momentData,
                image_url: mediaUrl
            }])
            .select();

        if (saveError) {
            console.error('Erro ao salvar no banco:', saveError);
            throw new Error(`Erro ao salvar no banco: ${saveError.message}`);
        }

        console.log('Momento salvo com sucesso:', savedMoment);
        addMomentToTimeline(savedMoment[0]);
        closeModal();
        e.target.reset();
    } catch (error) {
        console.error('Erro detalhado:', error);
        alert(`Erro ao salvar momento: ${error.message}`);
    }
});

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    // Carregar momentos
    loadMoments();
});

// Animações de scroll
document.querySelector('.scroll-arrow').addEventListener('click', () => {
    document.querySelector('.timeline').scrollIntoView({ behavior: 'smooth' });
});

// Music control functionality
const musicControl = document.getElementById('musicControl');
const backgroundMusic = document.getElementById('backgroundMusic');

// Try to play music automatically when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Set volume to 50%
    backgroundMusic.volume = 0.5;
    
    // Try to play automatically
    const playPromise = backgroundMusic.play();
    
    if (playPromise !== undefined) {
        playPromise.then(() => {
            // Autoplay started successfully
            musicControl.classList.add('playing');
        }).catch(() => {
            // Autoplay was prevented
            console.log('Autoplay prevented by browser');
        });
    }
});

musicControl.addEventListener('click', () => {
    if (backgroundMusic.paused) {
        backgroundMusic.play();
        musicControl.classList.add('playing');
    } else {
        backgroundMusic.pause();
        musicControl.classList.remove('playing');
    }
});