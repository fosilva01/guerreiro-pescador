// Aguardar o DOM carregar
document.addEventListener('DOMContentLoaded', function() {
    
    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas.getContext("2d");
    const loadingDiv = document.getElementById("loading");
    const errorMsg = document.getElementById("errorMsg");
    const phaseDisplay = document.getElementById("phaseDisplay");
    const nameInputScreen = document.getElementById("nameInputScreen");
    const playerNameInput = document.getElementById("playerNameInput");
    const soundStatus = document.getElementById("soundStatus");
    const gameContainer = document.getElementById("gameContainer");
    const orientationMsg = document.getElementById("orientationMessage");
    const recordDisplay = document.getElementById("recordDisplay");

    // ========== CONSTANTES DO JOGO ==========
    const ESTADO = {
        TELA_INICIAL: 'tela_inicial',
        JOGANDO: 'jogando',
        GAME_OVER: 'game_over',
        PAUSADO: 'pausado',
        RANKING: 'ranking',
        VITORIA: 'vitoria',
        VITORIA_FASE: 'vitoria_fase'
    };

    const TIPOS_INIMIGO = {
        JACARE: 'jacare',
        BOTO: 'boto'
    };

    const CONFIG = {
        MAX_FASE: 3,
        PEIXES_PARA_PROXIMA_FASE: 30,
        INVULNERABILIDADE_TEMPO: 2000,
        VIDA_EXTRA_CHANCE_BASE: 0.09,
        VIDA_EXTRA_TEMPO_VIDA: 300,
        CAMARAO_CHANCE_BASE: 0.09,
        CAMARAO_TEMPO_VIDA: 300,
        CAMARAO_DURACAO: 6000,
        TOTAL_IMAGENS: 9
    };

    // ========== ESTADOS DO JOGO ==========
    let estadoAtual = ESTADO.TELA_INICIAL;

    // ========== VARIÁVEIS PRINCIPAIS ==========
    let peixesPescados = 0;
    let vidas = 3;
    let gamePaused = false;
    let gameWin = false;
    let contagemRegressiva = 0;
    let faseAguardando = true;
    let faseAtual = 1;
    let peixesNestaFase = 0;
    let faseVitoriosa = 0;
    let musicaAtiva = true;

    // Power-ups
    let coracoes = [];
    let camaroes = [];
    let powerUpAtivo = false;
    let powerUpTempoRestante = 0;

    // Carregamento
    let jogoPronto = false;
    let imagensCarregadas = 0;
    let sonsCarregados = 0;
    let totalSons = 11;

    // ========== RANKING ==========
    let highScore = 0;
    let ranking = [];
    let nomeJogadorAtual = "";

    // Carregar ranking do localStorage
    function carregarRanking() {
        try {
            const savedHighScore = localStorage.getItem('ribeirinho_highScore');
            highScore = savedHighScore ? parseInt(savedHighScore) : 0;
            const savedRanking = localStorage.getItem('ribeirinho_ranking');
            ranking = savedRanking ? JSON.parse(savedRanking) : [];
            ranking.sort((a, b) => b.pontuacao - a.pontuacao);
            atualizarRecordDisplay();
        } catch (e) {
            highScore = 0;
            ranking = [];
        }
    }
    
    function salvarRanking() {
        try {
            ranking.sort((a, b) => b.pontuacao - a.pontuacao);
            if (ranking.length > 10) ranking = ranking.slice(0, 10);
            localStorage.setItem('ribeirinho_ranking', JSON.stringify(ranking));
            if (ranking.length > 0) {
                highScore = ranking[0].pontuacao;
                localStorage.setItem('ribeirinho_highScore', highScore.toString());
            }
            atualizarRecordDisplay();
        } catch (e) {}
    }
    
    function adicionarAoRanking(nome, pontuacao) {
        if (!nome || pontuacao <= 0) return false;
        const indexExistente = ranking.findIndex(j => j.nome === nome);
        if (indexExistente !== -1) {
            if (pontuacao > ranking[indexExistente].pontuacao) {
                ranking[indexExistente].pontuacao = pontuacao;
                ranking[indexExistente].data = new Date().toLocaleDateString();
            }
        } else {
            ranking.push({ nome: nome, pontuacao: pontuacao, data: new Date().toLocaleDateString() });
        }
        salvarRanking();
        return true;
    }

    function atualizarRecordDisplay() {
        if (recordDisplay) {
            recordDisplay.innerHTML = `🎯 Meta: ${CONFIG.PEIXES_PARA_PROXIMA_FASE} peixes | 🏆 Recorde: ${highScore}`;
        }
    }

    // Controle de som
    let somMovimentoTocando = false;
    let ultimaPosicao = { x: 450, y: 275 };

    // Cursor
    let mouseX = canvas.width / 2;
    let mouseY = canvas.height / 2;
    let mouseNoCanvas = false;

    // Partículas
    let particulas = [];

    // Arrays de inimigos e itens
    let jacares = [];
    let inimigos = [];
    let peixes = [];
    let keys = {};

    // ========== PLAYER ==========
    let player = {
        x: 450,
        y: 275,
        size: 70,
        baseSpeed: 5,
        speed: 5,
        respawnX: 450,
        respawnY: 275,
        invulneravel: false,
        collisionPercent: 0.8,
        paralisado: false
    };

    // ========== PEIXE ELÉTRICO ==========
    let peixeEletrico = {
        x: 0,
        y: 0,
        width: 70,
        height: 55,
        ativo: false,
        velocidade: 1.2,
        direcao: { x: 1, y: 0.2 },
        direcaoAnterior: { x: 1, y: 0.2 },
        angulo: 0,
        velocidadeAngular: 0.01,
        tempoMudancaDirecao: 0,
        tempoMudancaDirecaoMax: 180,
        cor: '#FFFF00',
        tempoChoque: 0,
        tempoChoqueMax: 150,
        tempoVida: 0,
        ondulacao: 0,
        velocidadeOndulacao: 0.02,
        movimentoSuave: { x: 0, y: 0, inercia: 0.92 },
        normalizarDirecao: function() {
            const mag = Math.sqrt(this.direcao.x * this.direcao.x + this.direcao.y * this.direcao.y);
            if (mag > 0) {
                this.direcao.x /= mag;
                this.direcao.y /= mag;
            }
        }
    };

    // ========== CONTROLES TOUCH ==========
    let touchActive = { up: false, down: false, left: false, right: false };
    let touchInterval = null;
    let isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    // Vibração
    let vibracaoAtiva = false;
    let vibracaoTimer = 0;

    // ========== FUNÇÃO DE ORIENTAÇÃO ==========
    function checkOrientation() {
        if (!orientationMsg) return;
        
        if (isMobile && window.innerHeight > window.innerWidth) {
            orientationMsg.style.display = 'flex';
            if (gameContainer) gameContainer.style.display = 'none';
        } else {
            orientationMsg.style.display = 'none';
            if (gameContainer) gameContainer.style.display = 'block';
            ajustarCanvasParaMobile();
        }
    }

    function ajustarCanvasParaMobile() {
        if (!isMobile || !canvas) return;
        const container = document.getElementById('gameContainer');
        if (!container) return;
        
        const maxWidth = window.innerWidth - 20;
        const maxHeight = window.innerHeight - 150;
        const ratio = Math.min(maxWidth / 900, maxHeight / 750);
        const newWidth = 900 * ratio;
        const newHeight = 750 * ratio;
        
        canvas.style.width = `${newWidth}px`;
        canvas.style.height = `${newHeight}px`;
    }

    function vibrar(duracao = 20) {
        if (isMobile && navigator.vibrate) {
            navigator.vibrate(duracao);
        }
    }

    function getCanvasCoordenadas(clientX, clientY) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        let x = (clientX - rect.left) * scaleX;
        let y = (clientY - rect.top) * scaleY;
        x = Math.max(0, Math.min(canvas.width, x));
        y = Math.max(0, Math.min(canvas.height, y));
        return { x, y };
    }

    // ========== IMAGENS ==========
    const imagens = {
        fundo: new Image(),
        player: new Image(),
        inimigo: new Image(),
        peixe: new Image(),
        camarao: new Image(),
        boto: new Image(),
        peixeEletrico: new Image(),
        telaInicial: new Image(),
        coracao: new Image()
    };

    // ========== SONS ==========
    const sons = {};
    const arquivosSom = [
        { nome: 'vidaExtra', arquivo: 'som/vida_extra.mp3', loop: false, volume: 0.9 },
        { nome: 'camarao', arquivo: 'som/camarao.mp3', loop: false, volume: 0.9 },
        { nome: 'inicioJogo', arquivo: 'som/inicio_jogo.mp3', loop: false, volume: 0.9 },
        { nome: 'movimento', arquivo: 'som/remo.mp3', loop: true, volume: 0.9 },
        { nome: 'choque', arquivo: 'som/choque.mp3', loop: false, volume: 0.9 },
        { nome: 'proximaFase', arquivo: 'som/proxima_fase.mp3', loop: false, volume: 0.9 },
        { nome: 'pegarPeixe', arquivo: 'som/pegar_peixe.mp3', loop: false, volume: 0.9 },
        { nome: 'gameOver', arquivo: 'som/game_over.mp3', loop: false, volume: 0.9 },
        { nome: 'vitoriaFase1', arquivo: 'som/vitoria_fase1.mp3', loop: false, volume: 0.9 },
        { nome: 'vitoriaFase2', arquivo: 'som/vitoria_fase2.mp3', loop: false, volume: 0.9 },
        { nome: 'vitoriaFinal', arquivo: 'som/vitoria.mp3', loop: false, volume: 0.9 }
    ];

    function carregarImagens() {
        const caminhos = {
            fundo: "imagem/rio.jpeg",
            player: "imagem/ribeirinho.png",
            inimigo: "imagem/jacare.png",
            peixe: "imagem/peixe.png",
            camarao: "imagem/camarao.png",
            boto: "imagem/boto.png",
            peixeEletrico: "imagem/peixe_eletrico.png",
            telaInicial: "imagem/tela_inicial.png",
            coracao: "imagem/coracao.png"
        };

        Object.keys(imagens).forEach(key => {
            imagens[key] = new Image();
            imagens[key].src = caminhos[key];
            imagens[key].onload = () => {
                imagensCarregadas++;
                if (imagensCarregadas === CONFIG.TOTAL_IMAGENS) verificarCarregamentoCompleto();
            };
            imagens[key].onerror = () => {
                console.log(`Erro ao carregar: ${caminhos[key]}`);
                imagensCarregadas++;
                if (imagensCarregadas === CONFIG.TOTAL_IMAGENS) verificarCarregamentoCompleto();
            };
        });
    }

    function carregarSons() {
        if (!soundStatus) return;
        soundStatus.textContent = "🔈 Carregando áudio...";
        
        arquivosSom.forEach(item => {
            try {
                const audio = new Audio();
                audio.src = item.arquivo;
                audio.loop = item.loop;
                audio.volume = item.volume;
                
                audio.addEventListener('canplaythrough', () => {
                    sonsCarregados++;
                    if (sonsCarregados === totalSons) {
                        soundStatus.textContent = "🔊 Áudio carregado";
                        soundStatus.style.color = "#98FB98";
                        verificarCarregamentoCompleto();
                    }
                });
                
                audio.addEventListener('error', () => {
                    sonsCarregados++;
                    if (sonsCarregados === totalSons) {
                        soundStatus.textContent = "🔈 Áudio parcial";
                        soundStatus.style.color = "#FFA500";
                        verificarCarregamentoCompleto();
                    }
                });
                
                audio.load();
                sons[item.nome] = audio;
            } catch (e) {
                sons[item.nome] = null;
                sonsCarregados++;
            }
        });
    }

    function verificarCarregamentoCompleto() {
        if (imagensCarregadas === CONFIG.TOTAL_IMAGENS && sonsCarregados === totalSons) {
            jogoPronto = true;
            if (loadingDiv) loadingDiv.style.display = "none";
            iniciarTelaInicial();
            gameLoop();
        }
    }

    function tocarSom(nomeSom, volume = null) {
        if (!musicaAtiva) return;
        const som = sons[nomeSom];
        if (!som) return;
        
        try {
            if (!som.loop) {
                const somClone = som.cloneNode();
                if (volume !== null) somClone.volume = volume;
                somClone.play().catch(() => {});
                somClone.addEventListener('ended', () => somClone.remove());
            } else {
                if (!som.paused) return;
                som.currentTime = 0;
                som.play().catch(() => {});
            }
        } catch (e) {}
    }

    function tocarSomMovimento() {
        if (!musicaAtiva) return;
        const som = sons['movimento'];
        if (!som) return;
        
        if (!somMovimentoTocando && !gamePaused && !gameWin && estadoAtual === ESTADO.JOGANDO) {
            try {
                som.currentTime = 0;
                som.play().then(() => { somMovimentoTocando = true; }).catch(() => {});
            } catch (e) {}
        }
    }

    function pararSomMovimento() {
        const som = sons['movimento'];
        if (!som) return;
        
        if (somMovimentoTocando) {
            som.pause();
            som.currentTime = 0;
            somMovimentoTocando = false;
        }
    }

    function getConfigFase(fase) {
        switch(fase) {
            case 1: return { qtdJacare: 1, qtdBoto: 0, peixeEletricoAtivo: false, velocidadeJacare: 1.2, velocidadePeixeEletrico: 0, chanceCoracao: 0.09, chanceCamarao: 0.09, qtdPeixes: 15 };
            case 2: return { qtdJacare: 2, qtdBoto: 0, peixeEletricoAtivo: true, velocidadeJacare: 1.4, velocidadePeixeEletrico: 1.1, chanceCoracao: 0.07, chanceCamarao: 0.07, qtdPeixes: 20 };
            case 3: return { qtdJacare: 1, qtdBoto: 1, peixeEletricoAtivo: true, velocidadeJacare: 1.6, velocidadePeixeEletrico: 1.2, tempoVidaBoto: 250, tempoInvisivelBoto: 500, chanceCoracao: 0.05, chanceCamarao: 0.05, qtdPeixes: 25 };
            default: return { qtdJacare: 1, qtdBoto: 0, peixeEletricoAtivo: false, velocidadeJacare: 1.2, velocidadePeixeEletrico: 0, chanceCoracao: 0.09, chanceCamarao: 0.09, qtdPeixes: 15 };
        }
    }

    function desenharTextoComBorda(texto, x, y, tamanho, corTexto, corBorda) {
        ctx.save();
        ctx.font = `bold ${tamanho}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = corBorda;
        for (let dx = -2; dx <= 2; dx += 2) {
            for (let dy = -2; dy <= 2; dy += 2) {
                ctx.fillText(texto, x + dx, y + dy);
            }
        }
        ctx.fillStyle = corTexto;
        ctx.fillText(texto, x, y);
        ctx.restore();
    }

    function criarParticulas(x, y, cor, quantidade = 10) {
        for (let i = 0; i < quantidade; i++) {
            particulas.push({ 
                x: x, 
                y: y, 
                vx: (Math.random() - 0.5) * 6, 
                vy: (Math.random() - 0.5) * 6, 
                vida: 30, 
                cor: cor, 
                tamanho: Math.random() * 4 + 2 
            });
        }
    }

    function desenharParticulas() {
        for (let i = particulas.length - 1; i >= 0; i--) {
            const p = particulas[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vida--;
            ctx.save();
            ctx.globalAlpha = p.vida / 30;
            ctx.fillStyle = p.cor;
            ctx.fillRect(p.x, p.y, p.tamanho, p.tamanho);
            ctx.restore();
            if (p.vida <= 0) particulas.splice(i, 1);
        }
    }

    function criarCoracao() {
        return { 
            x: Math.random() * (canvas.width - 40), 
            y: Math.random() * (canvas.height - 40), 
            size: 45, 
            tempoVida: CONFIG.VIDA_EXTRA_TEMPO_VIDA, 
            oscilacao: Math.random() * Math.PI * 10, 
            ativo: true 
        };
    }

    function criarCamarao() {
        return { 
            x: Math.random() * (canvas.width - 45), 
            y: Math.random() * (canvas.height - 45), 
            size: 45, 
            tempoVida: CONFIG.CAMARAO_TEMPO_VIDA, 
            oscilacao: Math.random() * Math.PI * 10, 
            rotacao: 0, 
            ativo: true 
        };
    }

    function criarJacareSimples(config) {
        return { 
            x: Math.random() * (canvas.width - 90), 
            y: Math.random() * (canvas.height - 45), 
            width: 90, 
            height: 45, 
            speed: config.velocidadeJacare, 
            direcaoX: 1, 
            ativo: true, 
            surgindo: true, 
            tempoSurgimento: 0, 
            duracaoSurgimento: 60, 
            escalaVertical: 0, 
            alpha: 0, 
            yOffset: 0 
        };
    }

    function criarBoto(config) {
        return { 
            x: Math.random() * (canvas.width - 85), 
            y: Math.random() * (canvas.height - 45), 
            width: 85, 
            height: 45, 
            ativo: true, 
            tipo: TIPOS_INIMIGO.BOTO, 
            speed: 0, 
            cor: '#FF69B4', 
            corClara: '#FFB6C1', 
            direcaoX: 1, 
            dano: 5, 
            visivel: true, 
            tempoVida: config.tempoVidaBoto || 250, 
            tempoInvisivel: config.tempoInvisivelBoto || 500, 
            tempoAtual: config.tempoVidaBoto || 250, 
            estado: 'visivel', 
            pula: true, 
            alturaPulo: 0, 
            direcaoPulo: 1, 
            surgindo: true, 
            tempoSurgimento: 0, 
            duracaoSurgimento: 60, 
            alpha: 0 
        };
    }

    function desenharAgua() {
        if (imagens.fundo && imagens.fundo.complete) {
            ctx.drawImage(imagens.fundo, 0, 0, canvas.width, canvas.height);
            if (estadoAtual !== ESTADO.TELA_INICIAL) {
                ctx.fillStyle = `rgba(100, 150, 255, ${0.1 + faseAtual * 0.05})`;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
        } else {
            const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
            grad.addColorStop(0, '#1E88E5');
            grad.addColorStop(1, '#0D47A1');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    }

    function desenharCoracao(coracao) {
        if (!coracao.ativo) return;
        coracao.tempoVida--;
        if (coracao.tempoVida <= 0) { coracao.ativo = false; return; }
        coracao.oscilacao += 0.10;
        const yOffset = Math.sin(coracao.oscilacao) * 10;
        
        if (imagens.coracao && imagens.coracao.complete) {
            ctx.save();
            ctx.shadowColor = '#FF6B6B';
            ctx.shadowBlur = 15;
            ctx.drawImage(imagens.coracao, coracao.x, coracao.y + yOffset, coracao.size, coracao.size);
            ctx.restore();
        } else {
            ctx.save();
            ctx.shadowColor = '#FF6B6B';
            ctx.shadowBlur = 15;
            ctx.fillStyle = '#FF4444';
            ctx.beginPath();
            ctx.moveTo(coracao.x + coracao.size/2, coracao.y + coracao.size/3 + yOffset);
            ctx.bezierCurveTo(coracao.x, coracao.y + yOffset, 
                              coracao.x - coracao.size/3, coracao.y + coracao.size/2 + yOffset, 
                              coracao.x + coracao.size/2, coracao.y + coracao.size + yOffset);
            ctx.bezierCurveTo(coracao.x + coracao.size, coracao.y + coracao.size/2 + yOffset, 
                              coracao.x + coracao.size, coracao.y + yOffset, 
                              coracao.x + coracao.size/2, coracao.y + coracao.size/3 + yOffset);
            ctx.fill();
            ctx.restore();
        }
    }

    function desenharCamarao(camarao) {
        if (!camarao.ativo) return;
        camarao.tempoVida--;
        if (camarao.tempoVida <= 0) { camarao.ativo = false; return; }
        camarao.oscilacao += 0.10;
        camarao.rotacao += 0.02;
        const yOffset = Math.sin(camarao.oscilacao) * 5;
        
        if (imagens.camarao && imagens.camarao.complete) {
            ctx.save();
            ctx.translate(camarao.x + camarao.size / 2, camarao.y + camarao.size / 2 + yOffset);
            ctx.rotate(camarao.rotacao);
            ctx.shadowColor = '#FFA500';
            ctx.shadowBlur = 20;
            ctx.drawImage(imagens.camarao, -camarao.size / 2, -camarao.size / 2, camarao.size, camarao.size);
            ctx.restore();
        } else {
            ctx.fillStyle = '#FF8C00';
            ctx.fillRect(camarao.x, camarao.y + yOffset, camarao.size, camarao.size/2);
        }
    }

    function desenharPeixeEletrico() {
        if (!peixeEletrico.ativo) return;
        
        if (imagens.peixeEletrico && imagens.peixeEletrico.complete) {
            ctx.save();
            if (peixeEletrico.tempoChoque > 0) {
                ctx.shadowColor = '#FFFF00';
                ctx.shadowBlur = 20 + Math.sin(Date.now() * 0.02) * 10;
            }
            const rotacao = Math.atan2(peixeEletrico.direcao.y, peixeEletrico.direcao.x);
            ctx.translate(peixeEletrico.x + peixeEletrico.width / 2, peixeEletrico.y + peixeEletrico.height / 2);
            ctx.rotate(rotacao);
            ctx.drawImage(imagens.peixeEletrico, -peixeEletrico.width / 2, -peixeEletrico.height / 2, peixeEletrico.width, peixeEletrico.height);
            ctx.restore();
        } else {
            ctx.fillStyle = '#FFFF00';
            ctx.beginPath();
            ctx.ellipse(peixeEletrico.x + peixeEletrico.width/2, peixeEletrico.y + peixeEletrico.height/2, peixeEletrico.width/2, peixeEletrico.height/2, 0, 0, Math.PI*2);
            ctx.fill();
        }
    }

    function desenharJacare(jacare) {
        if (!jacare.ativo) return;
        
        if (imagens.inimigo && imagens.inimigo.complete) {
            ctx.save();
            ctx.globalAlpha = jacare.alpha;
            ctx.translate(jacare.x + jacare.width / 2, jacare.y + jacare.height / 2 - jacare.yOffset);
            if (jacare.surgindo) ctx.scale(1, jacare.escalaVertical);
            ctx.scale(jacare.direcaoX, 1);
            ctx.drawImage(imagens.inimigo, -jacare.width / 2, -jacare.height / 2, jacare.width, jacare.height);
            ctx.restore();
        } else {
            ctx.fillStyle = '#2E7D32';
            ctx.fillRect(jacare.x, jacare.y, jacare.width, jacare.height);
            ctx.fillStyle = '#000';
            ctx.fillRect(jacare.x + 10, jacare.y + 5, 5, 5);
            ctx.fillRect(jacare.x + jacare.width - 15, jacare.y + 5, 5, 5);
        }
    }

    function desenharBoto(boto) {
        if (!boto.ativo || !boto.visivel) return;
        
        if (imagens.boto && imagens.boto.complete) {
            ctx.save();
            let alpha = boto.alpha || 1;
            if (boto.tempoAtual < 30) alpha = boto.tempoAtual / 30;
            ctx.globalAlpha = alpha;
            
            if (boto.pula) {
                boto.alturaPulo += 0.1 * boto.direcaoPulo;
                if (boto.alturaPulo > 10) boto.direcaoPulo = -1;
                else if (boto.alturaPulo < -10) boto.direcaoPulo = 1;
            }
            
            ctx.translate(boto.x + boto.width / 2, boto.y + boto.height / 2 + boto.alturaPulo);
            if (boto.direcaoX === -1) ctx.scale(-1, 1);
            ctx.drawImage(imagens.boto, -boto.width / 2, -boto.height / 2, boto.width, boto.height);
            ctx.restore();
        } else {
            ctx.fillStyle = '#FF69B4';
            ctx.beginPath();
            ctx.ellipse(boto.x + boto.width/2, boto.y + boto.height/2, boto.width/2, boto.height/2, 0, 0, Math.PI*2);
            ctx.fill();
        }
    }

    function desenharPeixes() {
        peixes.forEach(p => {
            if (imagens.peixe && imagens.peixe.complete) {
                ctx.drawImage(imagens.peixe, p.x, p.y, p.width, p.height);
            } else {
                ctx.fillStyle = '#87CEEB';
                ctx.fillRect(p.x, p.y, p.width, p.height);
            }
        });
    }

    function desenharPlayer() {
        ctx.save();
        if (powerUpAtivo) {
            ctx.beginPath();
            ctx.arc(player.x + player.size / 2, player.y + player.size / 2, player.size * 1.5, 0, Math.PI * 2);
            ctx.strokeStyle = '#FFA500';
            ctx.lineWidth = 4;
            ctx.stroke();
        }
        if (player.invulneravel && !powerUpAtivo) {
            ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.01) * 0.3;
        }
        if (peixeEletrico.tempoChoque > 0) {
            ctx.shadowColor = '#FFFF00';
            ctx.shadowBlur = 20;
        }
        
        if (imagens.player && imagens.player.complete) {
            ctx.drawImage(imagens.player, player.x, player.y, player.size, player.size);
        } else {
            ctx.fillStyle = '#FF4444';
            ctx.fillRect(player.x, player.y, player.size, player.size);
        }
        ctx.restore();
    }

    function desenharCursor() {
        if (!mouseNoCanvas || isMobile) return;
        if (estadoAtual !== ESTADO.TELA_INICIAL && estadoAtual !== ESTADO.RANKING) {
            ctx.save();
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 3;
            ctx.shadowColor = '#000';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(mouseX, mouseY, 15, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(mouseX, mouseY, 5, 0, Math.PI * 2);
            ctx.fillStyle = '#FFD700';
            ctx.fill();
            ctx.restore();
        }
    }

    function desenharRanking() {
        ctx.fillStyle = "rgba(0, 20, 40, 0.98)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 20;
        ctx.font = "bold 56px Arial";
        ctx.fillStyle = '#FFD700';
        ctx.textAlign = "center";
        ctx.fillText('🏆 RANKING 🏆', canvas.width / 2, 100);
        ctx.shadowBlur = 0;
        carregarRanking();
        if (ranking.length === 0) {
            ctx.font = "bold 32px Arial";
            ctx.fillStyle = '#FFFFFF';
            ctx.fillText('Nenhum registro ainda!', canvas.width / 2, 300);
            ctx.font = "24px Arial";
            ctx.fillStyle = '#98FB98';
            ctx.fillText('Jogue e faça sua melhor pontuação!', canvas.width / 2, 380);
        } else {
            ctx.font = "bold 24px Arial";
            ctx.fillStyle = '#FFD700';
            ctx.fillText('POS', canvas.width / 2 - 200, 180);
            ctx.fillText('JOGADOR', canvas.width / 2 - 50, 180);
            ctx.fillText('PEIXES', canvas.width / 2 + 150, 180);
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(canvas.width / 2 - 250, 200);
            ctx.lineTo(canvas.width / 2 + 250, 200);
            ctx.stroke();
            for (let i = 0; i < ranking.length; i++) {
                const y = 250 + i * 55;
                let medalha = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}º`;
                const corTexto = (ranking[i].nome === nomeJogadorAtual) ? '#FFD700' : '#FFFFFF';
                ctx.font = "bold 22px Arial";
                ctx.fillStyle = '#FFD700';
                ctx.fillText(medalha, canvas.width / 2 - 200, y);
                ctx.font = "20px Arial";
                ctx.fillStyle = corTexto;
                ctx.fillText(ranking[i].nome, canvas.width / 2 - 50, y);
                ctx.font = "bold 22px Arial";
                ctx.fillStyle = '#98FB98';
                ctx.fillText(ranking[i].pontuacao.toString(), canvas.width / 2 + 150, y);
                if (ranking[i].data) {
                    ctx.font = "12px Arial";
                    ctx.fillStyle = 'rgba(255,255,255,0.5)';
                    ctx.fillText(ranking[i].data, canvas.width / 2 + 220, y - 5);
                }
            }
        }
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#4CAF50';
        ctx.beginPath();
        roundRect(ctx, canvas.width / 2 - 120, 550, 240, 60, 30).fill();
        ctx.shadowBlur = 5;
        ctx.font = "bold 28px Arial";
        ctx.fillStyle = '#FFF';
        ctx.fillText('VOLTAR', canvas.width / 2, 585);
        ctx.shadowBlur = 0;
        ctx.font = "18px Arial";
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fillText('Pressione R para voltar', canvas.width / 2, 630);
    }

    function roundRect(ctx, x, y, w, h, r) {
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        return ctx;
    }

    function desenharTelaInicial() {
        if (imagens.telaInicial && imagens.telaInicial.complete) {
            ctx.drawImage(imagens.telaInicial, 0, 0, canvas.width, canvas.height);
        } else {
            desenharAgua();
        }
        
        // Configurações dos botões - DIMINUÍDOS E MAIS ABAIXO
        const centroX = canvas.width / 2;
        const centroY = canvas.height / 2;
        const larguraBotao = 220;        // Largura reduzida
        const alturaBotao = 60;           // Altura reduzida
        const espacamento = 20;            // Espaçamento reduzido
        const deslocamentoY = 50;          // Deslocamento para baixo
        
        // Calcular posições Y com deslocamento para baixo
        const alturaTotal = (alturaBotao * 2) + espacamento;
        const yInicial = (centroY - (alturaTotal / 2)) + deslocamentoY;
        
        const yJogar = yInicial;
        const yRanking = yInicial + alturaBotao + espacamento;
        
        // SOMBRA PARA DESTAQUE DOS BOTÕES
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 15;
        ctx.shadowOffsetY = 5;
        
        // BOTÃO JOGAR - Com gradiente
        const gradienteJogar = ctx.createLinearGradient(
            centroX - larguraBotao/2, yJogar,
            centroX + larguraBotao/2, yJogar + alturaBotao
        );
        gradienteJogar.addColorStop(0, '#4CAF50');
        gradienteJogar.addColorStop(0.5, '#45a049');
        gradienteJogar.addColorStop(1, '#2E7D32');
        
        ctx.fillStyle = gradienteJogar;
        ctx.beginPath();
        roundRect(ctx, centroX - larguraBotao/2, yJogar, larguraBotao, alturaBotao, 30).fill();
        
        // Borda dourada no botão JOGAR
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 3;
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#FFD700';
        ctx.stroke();
        
        // Texto do botão JOGAR
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#000';
        ctx.shadowOffsetY = 3;
        ctx.font = "bold 28px 'Arial', sans-serif";
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText('JOGAR', centroX, yJogar + alturaBotao/2);
        
        // BOTÃO RANKING - Com gradiente
        const gradienteRanking = ctx.createLinearGradient(
            centroX - larguraBotao/2, yRanking,
            centroX + larguraBotao/2, yRanking + alturaBotao
        );
        gradienteRanking.addColorStop(0, '#3498db');
        gradienteRanking.addColorStop(0.5, '#2980b9');
        gradienteRanking.addColorStop(1, '#1f4a7a');
        
        ctx.fillStyle = gradienteRanking;
        ctx.beginPath();
        roundRect(ctx, centroX - larguraBotao/2, yRanking, larguraBotao, alturaBotao, 30).fill();
        
        // Borda dourada no botão RANKING
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 3;
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#FFD700';
        ctx.stroke();
        
        // Texto do botão RANKING
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#000';
        ctx.shadowOffsetY = 3;
        ctx.font = "bold 28px 'Arial', sans-serif";
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText('RANKING', centroX, yRanking + alturaBotao/2);
        
        // Resetar sombras
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
        ctx.shadowColor = 'transparent';
    }

    function desenharMensagemVitoriaFase() {
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 30;
        ctx.font = "bold 64px Arial";
        ctx.fillStyle = '#FFD700';
        ctx.fillText('✨ VITÓRIA! ✨', canvas.width / 2, canvas.height / 2 - 80);
        ctx.font = "bold 48px Arial";
        ctx.fillStyle = '#98FB98';
        ctx.fillText(`FASE ${faseVitoriosa} CONCLUÍDA!`, canvas.width / 2, canvas.height / 2);
        ctx.font = "bold 24px Arial";
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(`Peixes: ${peixesPescados}`, canvas.width / 2, canvas.height / 2 + 60);
        ctx.font = "bold 20px Arial";
        ctx.fillStyle = '#FFD700';
        ctx.fillText('Preparando próxima fase...', canvas.width / 2, canvas.height / 2 + 120);
        ctx.shadowBlur = 0;
    }

    function desenharElementosJogo() {
        if (vibracaoAtiva) {
            ctx.save();
            ctx.translate(Math.random() * 10 - 5, Math.random() * 10 - 5);
        }
        desenharParticulas();
        coracoes.forEach(desenharCoracao);
        camaroes.forEach(desenharCamarao);
        desenharPeixes();
        
        if (peixeEletrico.ativo) desenharPeixeEletrico();
        jacares.forEach(desenharJacare);
        inimigos.forEach(desenharBoto);
        
        desenharPlayer();
        
        if (vibracaoAtiva) ctx.restore();
        
        ctx.fillStyle = "white";
        ctx.font = "bold 18px Arial";
        ctx.fillText(`🐟 ${peixesPescados}`, 25, 30);
        ctx.fillText(`❤️ ${vidas}`, 100, 30);
        ctx.fillText(`🌊 ${faseAtual}/${CONFIG.MAX_FASE}`, 175, 30);
        
        const progresso = peixesNestaFase / CONFIG.PEIXES_PARA_PROXIMA_FASE;
        ctx.fillStyle = "rgba(255,255,255,0.3)";
        ctx.fillRect(250, 20, 100, 15);
        ctx.fillStyle = "#4CAF50";
        ctx.fillRect(250, 20, 100 * Math.min(progresso, 1), 15);
        ctx.strokeStyle = "#FFD700";
        ctx.strokeRect(250, 20, 100, 15);
        
        if (player.paralisado) {
            ctx.fillStyle = "#FFFF00";
            ctx.font = "bold 16px Arial";
            ctx.fillText(`⚡ PARALISADO ${Math.ceil(peixeEletrico.tempoChoque / 60)}s`, 25, 60);
        }
        if (powerUpAtivo) {
            ctx.fillStyle = "#FFA500";
            ctx.font = "bold 14px Arial";
            ctx.fillText(`🦐 ${(powerUpTempoRestante / 1000).toFixed(1)}s`, 360, 30);
        }
        if (faseAguardando && contagemRegressiva > 0) {
            ctx.save();
            ctx.font = "bold 120px Arial";
            ctx.fillStyle = "#FFD700";
            ctx.fillText(contagemRegressiva.toString(), canvas.width / 2, canvas.height / 2);
            ctx.restore();
        }
    }

    function iniciarTelaInicial() {
        estadoAtual = ESTADO.TELA_INICIAL;
        canvas.style.cursor = "default";
        if (phaseDisplay) phaseDisplay.style.display = "none";
        if (touchInterval) {
            clearInterval(touchInterval);
            touchInterval = null;
            touchActive = { up: false, down: false, left: false, right: false };
        }
    }

    function iniciarJogo() {
        estadoAtual = ESTADO.JOGANDO;
        if (phaseDisplay) phaseDisplay.style.display = "block";
        if (!isMobile && mouseNoCanvas) canvas.style.cursor = "none";
        tocarSom('inicioJogo');
        resetarJogo();
    }

    function iniciarJogoFase() {
        peixes = []; 
        coracoes = []; 
        camaroes = []; 
        powerUpAtivo = false; 
        powerUpTempoRestante = 0;
        
        const config = getConfigFase(faseAtual);
        
        jacares = [];
        for (let i = 0; i < config.qtdJacare; i++) jacares.push(criarJacareSimples(config));
        
        inimigos = [];
        for (let i = 0; i < config.qtdBoto; i++) inimigos.push(criarBoto(config));
        
        peixeEletrico.ativo = config.peixeEletricoAtivo;
        if (peixeEletrico.ativo) {
            peixeEletrico.x = canvas.width * (0.3 + Math.random() * 0.4);
            peixeEletrico.y = canvas.height * (0.3 + Math.random() * 0.4);
            peixeEletrico.velocidade = 1.0 + (faseAtual * 0.1);
            peixeEletrico.direcao = { 
                x: (Math.random() > 0.5 ? 1 : -1) * (0.8 + Math.random() * 0.4), 
                y: (Math.random() - 0.5) * 0.6 
            };
            peixeEletrico.direcaoAnterior = { ...peixeEletrico.direcao };
            peixeEletrico.normalizarDirecao();
            peixeEletrico.tempoMudancaDirecao = Math.floor(Math.random() * 100);
            peixeEletrico.tempoMudancaDirecaoMax = 200 + Math.floor(Math.random() * 150);
            peixeEletrico.movimentoSuave = { x: 0, y: 0, inercia: 0.92 };
            peixeEletrico.ondulacao = Math.random() * Math.PI * 2;
            peixeEletrico.tempoChoque = 0;
        }
        
        for (let i = 0; i < config.qtdPeixes; i++) {
            peixes.push({ 
                x: Math.random() * (canvas.width - 40), 
                y: Math.random() * (canvas.height - 30), 
                width: 35, height: 25, 
                pontos: 1, 
                velocidade: 0.5, 
                direcao: Math.random() > 0.5 ? 1 : -1, 
                ativo: true, 
                ondulacao: Math.random() * Math.PI * 2, 
                collisionPercent: 0.9 
            });
        }
    }

    function iniciarProximaFase() {
        if (faseAtual < CONFIG.MAX_FASE) {
            faseVitoriosa = faseAtual;
            estadoAtual = ESTADO.VITORIA_FASE;
            criarParticulas(canvas.width / 2, canvas.height / 2, '#FFD700', 50);
            
            if (faseAtual === 1) tocarSom('vitoriaFase1');
            else if (faseAtual === 2) tocarSom('vitoriaFase2');
            
            setTimeout(() => {
                if (estadoAtual === ESTADO.VITORIA_FASE) {
                    faseAtual++;
                    peixesNestaFase = 0;
                    if (phaseDisplay) phaseDisplay.innerHTML = `🌊 FASE ${faseAtual}/${CONFIG.MAX_FASE}`;
                    tocarSom('proximaFase');
                    iniciarJogoFase();
                    estadoAtual = ESTADO.JOGANDO;
                    if (!isMobile && mouseNoCanvas) canvas.style.cursor = "none";
                }
            }, 3000);
        } else {
            gameWin = true;
            estadoAtual = ESTADO.VITORIA;
            canvas.style.cursor = "default";
            pararSomMovimento();
            tocarSom('vitoriaFinal');
            if (nomeJogadorAtual && peixesPescados > 0) adicionarAoRanking(nomeJogadorAtual, peixesPescados);
            for (let i = 0; i < 10; i++) {
                setTimeout(() => { 
                    criarParticulas(Math.random() * canvas.width, Math.random() * canvas.height, '#FFD700', 30); 
                }, i * 200);
            }
        }
    }

    function iniciarContagemRegressiva() {
        faseAguardando = true;
        contagemRegressiva = 3;
        player.invulneravel = true;
        player.paralisado = false;
        player.x = player.respawnX;
        player.y = player.respawnY;
        
        peixes = []; 
        coracoes = []; 
        camaroes = []; 
        jacares = []; 
        inimigos = []; 
        peixeEletrico.ativo = false; 
        powerUpAtivo = false; 
        powerUpTempoRestante = 0;
        
        const intervalo = setInterval(() => {
            contagemRegressiva--;
            if (contagemRegressiva === 0) {
                clearInterval(intervalo);
                faseAguardando = false;
                player.invulneravel = false;
                iniciarJogoFase();
            }
        }, 1000);
    }

    function resetarJogo() {
        if (nomeJogadorAtual && peixesPescados > 0) {
            adicionarAoRanking(nomeJogadorAtual, peixesPescados);
        }
        
        if (touchInterval) {
            clearInterval(touchInterval);
            touchInterval = null;
            touchActive = { up: false, down: false, left: false, right: false };
        }
        
        faseAtual = 1;
        peixesNestaFase = 0;
        peixesPescados = 0;
        vidas = 3;
        gamePaused = false;
        gameWin = false;
        faseAguardando = true;
        contagemRegressiva = 3;
        
        player.x = player.respawnX;
        player.y = player.respawnY;
        player.speed = player.baseSpeed;
        player.invulneravel = true;
        player.paralisado = false;
        
        peixes = []; 
        coracoes = []; 
        camaroes = []; 
        jacares = []; 
        inimigos = []; 
        peixeEletrico.ativo = false; 
        powerUpAtivo = false; 
        powerUpTempoRestante = 0; 
        particulas = [];
        
        if (phaseDisplay) phaseDisplay.innerHTML = `🌊 FASE ${faseAtual}/${CONFIG.MAX_FASE}`;
        
        setTimeout(() => {
            if (!gameWin && estadoAtual === ESTADO.JOGANDO) {
                iniciarContagemRegressiva();
            }
        }, 500);
    }

    function atualizarPeixeEletrico() {
        if (!peixeEletrico.ativo) return;
        
        peixeEletrico.tempoVida++;
        peixeEletrico.ondulacao += peixeEletrico.velocidadeOndulacao;
        
        if (peixeEletrico.tempoChoque > 0) peixeEletrico.tempoChoque--;
        
        peixeEletrico.tempoMudancaDirecao++;
        
        const centroX = canvas.width / 2;
        const centroY = canvas.height / 2;
        const tempo = peixeEletrico.tempoVida * 0.01;
        const tendenciaCentroX = (centroX - peixeEletrico.x) * 0.002;
        const tendenciaCentroY = (centroY - peixeEletrico.y) * 0.001;
        const ondaX = Math.sin(tempo * 1.3) * 0.4;
        const ondaY = Math.cos(tempo * 0.9) * 0.3;
        
        if (peixeEletrico.tempoMudancaDirecao > peixeEletrico.tempoMudancaDirecaoMax) {
            const anguloNovo = Math.atan2(
                centroY - peixeEletrico.y + (Math.random() - 0.5) * 100, 
                centroX - peixeEletrico.x + (Math.random() - 0.5) * 150
            );
            peixeEletrico.direcaoAnterior = { ...peixeEletrico.direcao };
            peixeEletrico.direcao.x = Math.cos(anguloNovo);
            peixeEletrico.direcao.y = Math.sin(anguloNovo) * 0.6;
            peixeEletrico.normalizarDirecao();
            peixeEletrico.tempoMudancaDirecao = 0;
            peixeEletrico.tempoMudancaDirecaoMax = 200 + Math.floor(Math.random() * 150);
        }
        
        const suavizacao = 0.03;
        peixeEletrico.direcao.x = peixeEletrico.direcao.x * (1 - suavizacao) + peixeEletrico.direcaoAnterior.x * suavizacao;
        peixeEletrico.direcao.y = peixeEletrico.direcao.y * (1 - suavizacao) + peixeEletrico.direcaoAnterior.y * suavizacao;
        peixeEletrico.normalizarDirecao();
        
        let moveX = peixeEletrico.velocidade * peixeEletrico.direcao.x;
        let moveY = peixeEletrico.velocidade * peixeEletrico.direcao.y;
        moveX += tendenciaCentroX + ondaX * 0.3;
        moveY += tendenciaCentroY + ondaY * 0.3;
        
        peixeEletrico.movimentoSuave.x = peixeEletrico.movimentoSuave.x * peixeEletrico.movimentoSuave.inercia + moveX * (1 - peixeEletrico.movimentoSuave.inercia);
        peixeEletrico.movimentoSuave.y = peixeEletrico.movimentoSuave.y * peixeEletrico.movimentoSuave.inercia + moveY * (1 - peixeEletrico.movimentoSuave.inercia);
        
        peixeEletrico.x += peixeEletrico.movimentoSuave.x;
        peixeEletrico.y += peixeEletrico.movimentoSuave.y;
        
        peixeEletrico.x = Math.max(0, Math.min(peixeEletrico.x, canvas.width - peixeEletrico.width));
        peixeEletrico.y = Math.max(20, Math.min(peixeEletrico.y, canvas.height - peixeEletrico.height - 20));
        
        peixeEletrico.y += Math.sin(peixeEletrico.ondulacao) * 0.8;
        
        if (!player.invulneravel && !powerUpAtivo && !player.paralisado) {
            if (player.x < peixeEletrico.x + peixeEletrico.width && 
                player.x + player.size > peixeEletrico.x && 
                player.y < peixeEletrico.y + peixeEletrico.height && 
                player.y + player.size > peixeEletrico.y) {
                
                player.paralisado = true;
                player.speed = 0;
                peixeEletrico.tempoChoque = peixeEletrico.tempoChoqueMax;
                vibracaoAtiva = true;
                vibracaoTimer = 150;
                tocarSom('choque');
                vibrar(100);
                criarParticulas(player.x + player.size / 2, player.y + player.size / 2, '#FFFF00', 15);
                
                const dx = player.x + player.size / 2 - (peixeEletrico.x + peixeEletrico.width / 2);
                const dy = player.y + player.size / 2 - (peixeEletrico.y + peixeEletrico.height / 2);
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 0) {
                    player.x += (dx / dist) * 40;
                    player.y += (dy / dist) * 40;
                }
                player.x = Math.max(0, Math.min(player.x, canvas.width - player.size));
                player.y = Math.max(0, Math.min(player.y, canvas.height - player.size));
            }
        }
    }

    function atualizar() {
        if (!jogoPronto) return;
        if (estadoAtual === ESTADO.VITORIA_FASE || estadoAtual === ESTADO.VITORIA) return;
        if (estadoAtual !== ESTADO.JOGANDO || gamePaused || gameWin || faseAguardando) return;
        
        if (vibracaoAtiva) {
            vibracaoTimer--;
            if (vibracaoTimer <= 0) vibracaoAtiva = false;
        }
        
        if (player.paralisado) {
            peixeEletrico.tempoChoque--;
            if (peixeEletrico.tempoChoque <= 0) {
                player.paralisado = false;
                player.speed = player.baseSpeed;
                vibracaoAtiva = false;
            }
        } else {
            if (keys["ArrowUp"] && player.y > 0) player.y -= player.speed;
            if (keys["ArrowDown"] && player.y + player.size < canvas.height) player.y += player.speed;
            if (keys["ArrowLeft"] && player.x > 0) player.x -= player.speed;
            if (keys["ArrowRight"] && player.x + player.size < canvas.width) player.x += player.speed;
            
            const movendo = keys["ArrowUp"] || keys["ArrowDown"] || keys["ArrowLeft"] || keys["ArrowRight"] || 
                           touchActive.up || touchActive.down || touchActive.left || touchActive.right;
            if (movendo) {
                if (player.x !== ultimaPosicao.x || player.y !== ultimaPosicao.y) {
                    tocarSomMovimento();
                    ultimaPosicao = { x: player.x, y: player.y };
                }
            } else {
                pararSomMovimento();
            }
        }
        
        const config = getConfigFase(faseAtual);
        
        // Gerar power-ups com chance reduzida
        if (Math.random() < config.chanceCoracao / 100) coracoes.push(criarCoracao());
        if (!powerUpAtivo && Math.random() < config.chanceCamarao / 100) camaroes.push(criarCamarao());
        
        // Atualizar power-ups
        coracoes = coracoes.filter(c => c.ativo);
        coracoes.forEach(c => {
            if (player.x < c.x + c.size && player.x + player.size > c.x && 
                player.y < c.y + c.size && player.y + player.size > c.y) {
                vidas++;
                c.ativo = false;
                tocarSom('vidaExtra');
                vibrar(30);
                player.invulneravel = true;
                setTimeout(() => { 
                    if (!gameWin && !powerUpAtivo) player.invulneravel = false; 
                }, 500);
            }
        });
        
        camaroes = camaroes.filter(c => c.ativo);
        camaroes.forEach(c => {
            if (player.x < c.x + c.size && player.x + player.size > c.x && 
                player.y < c.y + c.size && player.y + player.size > c.y) {
                powerUpAtivo = true;
                powerUpTempoRestante = CONFIG.CAMARAO_DURACAO;
                c.ativo = false;
                player.invulneravel = false;
                tocarSom('camarao');
                vibrar(50);
                criarParticulas(player.x + player.size / 2, player.y + player.size / 2, '#FFA500', 15);
            }
        });
        camaroes = camaroes.filter(c => c.ativo);
        
        // Atualizar power-up timer
        if (powerUpAtivo) {
            powerUpTempoRestante -= 16;
            if (powerUpTempoRestante <= 0) {
                powerUpAtivo = false;
            }
        }
        
        // Atualizar jacarés
        jacares.forEach(jacare => {
            if (jacare.surgindo) {
                jacare.tempoSurgimento++;
                const progresso = Math.min(jacare.tempoSurgimento / jacare.duracaoSurgimento, 1);
                jacare.alpha = progresso;
                jacare.escalaVertical = Math.sin(progresso * Math.PI / 2);
                jacare.yOffset = (1 - jacare.escalaVertical) * 40;
                if (jacare.tempoSurgimento >= jacare.duracaoSurgimento) {
                    jacare.surgindo = false;
                    jacare.escalaVertical = 1;
                    jacare.alpha = 1;
                    jacare.yOffset = 0;
                }
            }
            
            const centroJX = jacare.x + jacare.width / 2;
            const centroJY = jacare.y + jacare.height / 2;
            const centroPX = player.x + player.size / 2;
            const centroPY = player.y + player.size / 2;
            
            jacare.direcaoX = centroPX > centroJX ? 1 : -1;
            
            const dx = centroPX - centroJX;
            const dy = centroPY - centroJY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 5) {
                jacare.x += (dx / dist) * jacare.speed;
                jacare.y += (dy / dist) * jacare.speed;
            }
            
            jacare.x = Math.max(0, Math.min(jacare.x, canvas.width - jacare.width));
            jacare.y = Math.max(0, Math.min(jacare.y, canvas.height - jacare.height));
            
            if (!jacare.surgindo && !player.invulneravel && !powerUpAtivo && !player.paralisado) {
                if (player.x < jacare.x + jacare.width && player.x + player.size > jacare.x && 
                    player.y < jacare.y + jacare.height && player.y + player.size > jacare.y) {
                    vidas--;
                    player.invulneravel = true;
                    player.x = player.respawnX;
                    player.y = player.respawnY;
                    criarParticulas(player.x + player.size / 2, player.y + player.size / 2, '#FF0000', 10);
                    vibrar(80);
                    
                    setTimeout(() => player.invulneravel = false, CONFIG.INVULNERABILIDADE_TEMPO);
                    
                    if (vidas <= 0) {
                        gameWin = true;
                        estadoAtual = ESTADO.GAME_OVER;
                        canvas.style.cursor = "default";
                        pararSomMovimento();
                        tocarSom('gameOver');
                        vibrar(200);
                        if (nomeJogadorAtual && peixesPescados > 0) {
                            adicionarAoRanking(nomeJogadorAtual, peixesPescados);
                        }
                    }
                }
            }
        });
        
        // Atualizar peixe elétrico
        if (peixeEletrico.ativo) atualizarPeixeEletrico();
        
        // Atualizar botos
        inimigos.forEach(boto => {
            if (!boto.ativo) return;
            
            if (boto.surgindo) {
                boto.tempoSurgimento++;
                const progresso = Math.min(boto.tempoSurgimento / boto.duracaoSurgimento, 1);
                boto.alpha = progresso;
                if (boto.tempoSurgimento >= boto.duracaoSurgimento) {
                    boto.surgindo = false;
                    boto.alpha = 1;
                }
            }
            
            boto.tempoAtual--;
            
            if (boto.estado === 'visivel') {
                if (boto.tempoAtual <= 0) {
                    boto.estado = 'invisivel';
                    boto.visivel = false;
                    boto.tempoAtual = boto.tempoInvisivel;
                }
            } else {
                if (boto.tempoAtual <= 0) {
                    boto.x = Math.random() * (canvas.width - boto.width);
                    boto.y = Math.random() * (canvas.height - boto.height);
                    boto.estado = 'visivel';
                    boto.visivel = true;
                    boto.tempoAtual = boto.tempoVida;
                    const centroAX = boto.x + boto.width / 2;
                    const centroPX = player.x + player.size / 2;
                    boto.direcaoX = centroPX > centroAX ? 1 : -1;
                }
            }
            
            if (!player.invulneravel && !powerUpAtivo && !player.paralisado && boto.visivel) {
                if (player.x < boto.x + boto.width && player.x + player.size > boto.x && 
                    player.y < boto.y + boto.height && player.y + player.size > boto.y) {
                    vidas -= boto.dano || 1;
                    player.invulneravel = true;
                    player.x = player.respawnX;
                    player.y = player.respawnY;
                    criarParticulas(player.x + player.size / 2, player.y + player.size / 2, '#FF0000', 10);
                    vibrar(80);
                    
                    setTimeout(() => player.invulneravel = false, CONFIG.INVULNERABILIDADE_TEMPO);
                    
                    if (vidas <= 0) {
                        gameWin = true;
                        estadoAtual = ESTADO.GAME_OVER;
                        canvas.style.cursor = "default";
                        pararSomMovimento();
                        tocarSom('gameOver');
                        vibrar(200);
                        if (nomeJogadorAtual && peixesPescados > 0) {
                            adicionarAoRanking(nomeJogadorAtual, peixesPescados);
                        }
                    }
                }
            }
        });
        
        // Atualizar peixes
        peixes.forEach(p => {
            if (p.ativo) {
                p.x += p.velocidade * p.direcao;
                if (p.x < 0 || p.x + p.width > canvas.width) p.direcao *= -1;
                
                if (player.x < p.x + p.width && player.x + player.size > p.x && 
                    player.y < p.y + p.height && player.y + player.size > p.y) {
                    peixesPescados++;
                    peixesNestaFase++;
                    p.ativo = false;
                    tocarSom('pegarPeixe');
                    criarParticulas(p.x + p.width / 2, p.y + p.height / 2, '#87CEEB', 5);
                    
                    if (peixesNestaFase >= CONFIG.PEIXES_PARA_PROXIMA_FASE) {
                        iniciarProximaFase();
                        return;
                    }
                }
            }
        });
        
        peixes = peixes.filter(p => p.ativo);
        const configAtual = getConfigFase(faseAtual);
        while (peixes.length < configAtual.qtdPeixes) {
            peixes.push({ 
                x: Math.random() * (canvas.width - 40), 
                y: Math.random() * (canvas.height - 30), 
                width: 35, height: 25, 
                pontos: 1, 
                velocidade: 0.5, 
                direcao: Math.random() > 0.5 ? 1 : -1, 
                ativo: true, 
                ondulacao: Math.random() * Math.PI * 2, 
                collisionPercent: 0.9 
            });
        }
    }

    function desenhar() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (estadoAtual === ESTADO.TELA_INICIAL) {
            desenharTelaInicial();
        } else {
            desenharAgua();
            
            if (estadoAtual === ESTADO.RANKING) {
                desenharRanking();
            } else if (estadoAtual === ESTADO.GAME_OVER) {
                ctx.fillStyle = "rgba(0,0,0,0.8)";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                desenharTextoComBorda('GAME OVER', canvas.width / 2, 200, 64, '#FF4444', '#000');
                desenharTextoComBorda(`Total: ${peixesPescados} peixes`, canvas.width / 2, 280, 36, '#FFF', '#000');
                desenharTextoComBorda(`Fase alcançada: ${faseAtual}`, canvas.width / 2, 330, 24, '#FFD700', '#000');
                desenharTextoComBorda('Pressione R para voltar', canvas.width / 2, 380, 22, '#FFD700', '#000');
            } else if (estadoAtual === ESTADO.VITORIA) {
                ctx.fillStyle = "rgba(0,0,0,0.9)";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                desenharParticulas();
                desenharTextoComBorda('🏆 CAMPEÃO! 🏆', canvas.width / 2, 180, 64, '#FFD700', '#000');
                desenharTextoComBorda('VOCÊ VENCEU O JOGO!', canvas.width / 2, 260, 48, '#98FB98', '#000');
                desenharTextoComBorda(`Total de peixes: ${peixesPescados}`, canvas.width / 2, 340, 36, '#FFF', '#000');
                desenharTextoComBorda('Pressione R para voltar ao menu', canvas.width / 2, 420, 24, '#FFD700', '#000');
            } else if (estadoAtual === ESTADO.VITORIA_FASE) {
                desenharElementosJogo();
                desenharMensagemVitoriaFase();
            } else if (estadoAtual === ESTADO.PAUSADO) {
                desenharElementosJogo();
                ctx.fillStyle = "rgba(0,0,0,0.5)";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                desenharTextoComBorda('PAUSADO', canvas.width / 2, canvas.height / 2, 64, '#FFF', '#000');
            } else {
                desenharElementosJogo();
            }
        }
        
        desenharCursor();
    }

    function gameLoop() {
        try {
            atualizar();
            desenhar();
        } catch (e) {
            console.log("Erro no game loop:", e);
        }
        requestAnimationFrame(gameLoop);
    }

    function iniciarControlesTouch() {
        if (!isMobile) return;
        
        const touchUp = document.getElementById('touchUp');
        const touchDown = document.getElementById('touchDown');
        const touchLeft = document.getElementById('touchLeft');
        const touchRight = document.getElementById('touchRight');
        const touchPause = document.getElementById('touchPause');
        const touchMenu = document.getElementById('touchMenu');
        
        if (!touchUp) return;

        const handleTouchStart = (direcao) => (e) => {
            e.preventDefault();
            touchActive[direcao] = true;
            vibrar(10);
            iniciarMovimentoContinuo();
        };

        const handleTouchEnd = (direcao) => (e) => {
            e.preventDefault();
            touchActive[direcao] = false;
            if (!touchActive.up && !touchActive.down && !touchActive.left && !touchActive.right) {
                pararMovimentoSeNecessario();
            }
        };

        [touchUp, touchDown, touchLeft, touchRight, touchPause, touchMenu].forEach(btn => {
            if (btn) {
                btn.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
            }
        });

        touchUp.addEventListener('touchstart', handleTouchStart('up'), { passive: false });
        touchUp.addEventListener('touchend', handleTouchEnd('up'), { passive: false });
        touchUp.addEventListener('touchcancel', handleTouchEnd('up'), { passive: false });

        touchDown.addEventListener('touchstart', handleTouchStart('down'), { passive: false });
        touchDown.addEventListener('touchend', handleTouchEnd('down'), { passive: false });
        touchDown.addEventListener('touchcancel', handleTouchEnd('down'), { passive: false });

        touchLeft.addEventListener('touchstart', handleTouchStart('left'), { passive: false });
        touchLeft.addEventListener('touchend', handleTouchEnd('left'), { passive: false });
        touchLeft.addEventListener('touchcancel', handleTouchEnd('left'), { passive: false });

        touchRight.addEventListener('touchstart', handleTouchStart('right'), { passive: false });
        touchRight.addEventListener('touchend', handleTouchEnd('right'), { passive: false });
        touchRight.addEventListener('touchcancel', handleTouchEnd('right'), { passive: false });

        touchPause.addEventListener('touchstart', (e) => {
            e.preventDefault();
            vibrar(15);
            if (estadoAtual === ESTADO.JOGANDO) {
                gamePaused = !gamePaused;
                estadoAtual = gamePaused ? ESTADO.PAUSADO : ESTADO.JOGANDO;
                if (gamePaused) pararSomMovimento();
            } else if (estadoAtual === ESTADO.PAUSADO) {
                gamePaused = false;
                estadoAtual = ESTADO.JOGANDO;
            }
        }, { passive: false });

        touchMenu.addEventListener('touchstart', (e) => {
            e.preventDefault();
            vibrar(20);
            if (estadoAtual === ESTADO.JOGANDO || estadoAtual === ESTADO.PAUSADO) {
                resetarJogo();
                estadoAtual = ESTADO.TELA_INICIAL;
                canvas.style.cursor = "default";
                pararSomMovimento();
            }
        }, { passive: false });
    }

    function iniciarMovimentoContinuo() {
        if (touchInterval) return;
        
        touchInterval = setInterval(() => {
            if (estadoAtual !== ESTADO.JOGANDO || gamePaused || gameWin || faseAguardando || player.paralisado) return;
            
            let moveX = 0, moveY = 0;
            
            if (touchActive.up) moveY -= 1;
            if (touchActive.down) moveY += 1;
            if (touchActive.left) moveX -= 1;
            if (touchActive.right) moveX += 1;
            
            if (moveX !== 0 || moveY !== 0) {
                if (moveX !== 0 && moveY !== 0) {
                    const length = Math.sqrt(2);
                    moveX /= length;
                    moveY /= length;
                }
                
                const newX = player.x + moveX * player.speed;
                const newY = player.y + moveY * player.speed;
                
                if (newX >= 0 && newX + player.size <= canvas.width) player.x = newX;
                if (newY >= 0 && newY + player.size <= canvas.height) player.y = newY;
            }
        }, 16);
    }

    function pararMovimentoSeNecessario() {
        if (touchInterval) {
            clearInterval(touchInterval);
            touchInterval = null;
            pararSomMovimento();
        }
    }

    document.body.addEventListener('touchmove', (e) => {
        if (e.target === canvas || e.target.closest('.touch-btn') || e.target.closest('.touch-action')) {
            e.preventDefault();
        }
    }, { passive: false });

    canvas.addEventListener("mouseenter", () => {
        if (!isMobile) {
            mouseNoCanvas = true;
            if (estadoAtual === ESTADO.TELA_INICIAL || estadoAtual === ESTADO.RANKING) {
                canvas.style.cursor = "default";
            } else {
                canvas.style.cursor = "none";
            }
        }
    });

    canvas.addEventListener("mouseleave", () => {
        if (!isMobile) {
            mouseNoCanvas = false;
            canvas.style.cursor = "default";
        }
    });

    canvas.addEventListener("mousemove", (e) => {
        if (!isMobile) {
            const { x, y } = getCanvasCoordenadas(e.clientX, e.clientY);
            mouseX = x;
            mouseY = y;
        }
    });

    canvas.addEventListener("click", (e) => {
        const { x, y } = getCanvasCoordenadas(e.clientX, e.clientY);
        
        if (estadoAtual === ESTADO.TELA_INICIAL) {
            const centroX = canvas.width / 2;
            const centroY = canvas.height / 2;
            const larguraBotao = 220;
            const alturaBotao = 60;
            const espacamento = 20;
            const deslocamentoY = 50;
            
            // Calcular posições Y com deslocamento
            const alturaTotal = (alturaBotao * 2) + espacamento;
            const yInicial = (centroY - (alturaTotal / 2)) + deslocamentoY;
            
            const yJogar = yInicial;
            const yRanking = yInicial + alturaBotao + espacamento;
            
            // Detectar clique no botão JOGAR
            if (x >= centroX - larguraBotao/2 && x <= centroX + larguraBotao/2 &&
                y >= yJogar && y <= yJogar + alturaBotao) {
                nameInputScreen.style.display = "flex";
                playerNameInput.focus();
            }
            // Detectar clique no botão RANKING
            else if (x >= centroX - larguraBotao/2 && x <= centroX + larguraBotao/2 &&
                     y >= yRanking && y <= yRanking + alturaBotao) {
                estadoAtual = ESTADO.RANKING;
                carregarRanking();
            }
        } else if (estadoAtual === ESTADO.RANKING) {
            if (y > 550 && y < 610) {
                estadoAtual = ESTADO.TELA_INICIAL;
            }
        }
    });

    canvas.addEventListener("touchstart", (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const { x, y } = getCanvasCoordenadas(touch.clientX, touch.clientY);
        
        if (estadoAtual === ESTADO.TELA_INICIAL) {
            const centroX = canvas.width / 2;
            const centroY = canvas.height / 2;
            const larguraBotao = 220;
            const alturaBotao = 60;
            const espacamento = 20;
            const deslocamentoY = 50;
            
            // Calcular posições Y com deslocamento
            const alturaTotal = (alturaBotao * 2) + espacamento;
            const yInicial = (centroY - (alturaTotal / 2)) + deslocamentoY;
            
            const yJogar = yInicial;
            const yRanking = yInicial + alturaBotao + espacamento;
            
            // Detectar toque no botão JOGAR
            if (x >= centroX - larguraBotao/2 && x <= centroX + larguraBotao/2 &&
                y >= yJogar && y <= yJogar + alturaBotao) {
                nameInputScreen.style.display = "flex";
                playerNameInput.focus();
            }
            // Detectar toque no botão RANKING
            else if (x >= centroX - larguraBotao/2 && x <= centroX + larguraBotao/2 &&
                     y >= yRanking && y <= yRanking + alturaBotao) {
                estadoAtual = ESTADO.RANKING;
                carregarRanking();
            }
        } else if (estadoAtual === ESTADO.RANKING) {
            if (x >= canvas.width / 2 - 120 && x <= canvas.width / 2 + 120 && y >= 550 && y <= 610) {
                estadoAtual = ESTADO.TELA_INICIAL;
            }
        }
    }, { passive: false });

    document.addEventListener("keydown", (e) => {
        if (e.key === "m" || e.key === "M") {
            musicaAtiva = !musicaAtiva;
            if (!musicaAtiva) pararSomMovimento();
            if (soundStatus) {
                soundStatus.textContent = musicaAtiva ? "🔊 Música ativada" : "🔈 Música desativada";
                soundStatus.style.color = musicaAtiva ? "#98FB98" : "#FFA500";
                setTimeout(() => {
                    if (sonsCarregados === totalSons) {
                        soundStatus.textContent = "🔊 Áudio carregado";
                    }
                }, 2000);
            }
        }

        if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
            e.preventDefault();
            keys[e.key] = true;
        }
        
        if (estadoAtual === ESTADO.TELA_INICIAL && e.key === " ") {
            e.preventDefault();
            nameInputScreen.style.display = "flex";
            playerNameInput.focus();
        } else if (estadoAtual === ESTADO.JOGANDO) {
            if (e.key === "p" || e.key === "P") {
                gamePaused = !gamePaused;
                estadoAtual = gamePaused ? ESTADO.PAUSADO : ESTADO.JOGANDO;
                if (gamePaused) pararSomMovimento();
            }
            if (e.key === "r" || e.key === "R") {
                pararSomMovimento();
                resetarJogo();
                estadoAtual = ESTADO.TELA_INICIAL;
                canvas.style.cursor = "default";
            }
        } else if (estadoAtual === ESTADO.PAUSADO && (e.key === "p" || e.key === "P")) {
            gamePaused = false;
            estadoAtual = ESTADO.JOGANDO;
            if (!isMobile && mouseNoCanvas) canvas.style.cursor = "none";
        } else if (estadoAtual === ESTADO.GAME_OVER && e.key === "r") {
            estadoAtual = ESTADO.TELA_INICIAL;
        } else if (estadoAtual === ESTADO.VITORIA && e.key === "r") {
            estadoAtual = ESTADO.TELA_INICIAL;
        } else if (estadoAtual === ESTADO.VITORIA_FASE && e.key === "r") {
            resetarJogo();
            estadoAtual = ESTADO.TELA_INICIAL;
            canvas.style.cursor = "default";
            pararSomMovimento();
        } else if (estadoAtual === ESTADO.RANKING && e.key === "r") {
            estadoAtual = ESTADO.TELA_INICIAL;
        }
    });

    document.addEventListener("keyup", (e) => {
        if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
            keys[e.key] = false;
            if (!keys["ArrowUp"] && !keys["ArrowDown"] && !keys["ArrowLeft"] && !keys["ArrowRight"] &&
                !touchActive.up && !touchActive.down && !touchActive.left && !touchActive.right) {
                pararSomMovimento();
            }
        }
    });

    window.confirmarNome = function() {
        const nome = playerNameInput.value.trim();
        if (nome) {
            nomeJogadorAtual = nome;
            nameInputScreen.style.display = "none";
            tocarSom('inicioJogo');
            vibrar(50);
            iniciarJogo();
        } else {
            alert("Por favor, digite seu nome!");
        }
    };

    window.fecharInputNome = function() {
        nameInputScreen.style.display = "none";
    };

    window.addEventListener('load', () => {
        iniciarControlesTouch();
        carregarRanking();
        checkOrientation();
        ajustarCanvasParaMobile();
        atualizarRecordDisplay();
        
        setTimeout(() => {
            if (!jogoPronto) {
                jogoPronto = true;
                if (loadingDiv) loadingDiv.style.display = "none";
                if (soundStatus) soundStatus.textContent = "🔈 Áudio indisponível";
                iniciarTelaInicial();
                gameLoop();
            }
        }, 5000);
    });

    window.addEventListener('resize', () => {
        checkOrientation();
        ajustarCanvasParaMobile();
    });
    
    window.addEventListener('orientationchange', () => {
        setTimeout(() => {
            checkOrientation();
            ajustarCanvasParaMobile();
        }, 100);
    });

    document.addEventListener('contextmenu', (e) => e.preventDefault());

    setTimeout(() => {
        iniciarControlesTouch();
    }, 1000);

    if (loadingDiv) loadingDiv.style.display = "block";
    carregarSons();
    carregarRanking();
    carregarImagens();
});