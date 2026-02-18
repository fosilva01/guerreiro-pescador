window.onload = function () {
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Estados do jogo
const ESTADO = {
    TELA_INICIAL: 'tela_inicial',
    JOGANDO: 'jogando',
    GAME_OVER: 'game_over',
    VITORIA: 'vitoria',
    PAUSADO: 'pausado'
};

let estadoAtual = ESTADO.TELA_INICIAL;

// Variáveis do jogo
let peixesPescados = 0;
let lives = 3;
let fase = 1;
let gameOver = false;
let gamePaused = false;
let gameWin = false;

let mensagemNivel = "";
let mensagemTempo = 0;
let contagemRegressiva = 0;
let faseAguardando = true;

const MAX_FASE = 10;
const INVULNERABILIDADE_TEMPO = 2000;
const POWER_UP_DURACAO = 5000;
const POWER_UP_CHANCE = 0.3;

let jogoPronto = false;

// Sistema de High Score
let highScore = localStorage.getItem('highScore') ? parseInt(localStorage.getItem('highScore')) : 0;

// Animações da tela inicial
let tempoAnimacao = 0;

const musicaFundo = new Audio();
musicaFundo.src = "som/musica_fundo.mp3";
musicaFundo.loop = true;
musicaFundo.volume = 0.3;

// Tentar tocar música (será ativado no primeiro clique)
musicaFundo.play().catch(() => {
    console.log("Autoplay bloqueado. Clique na tela para ativar a música.");
});

const rio = { y: 0, altura: canvas.height };

// Sistema simplificado de ondas da água
let agua = {
    offset: 0,
    velocidade: 0.02
};

let player = { 
    x: 400, y: 250, size: 70, 
    baseSpeed: 5, speed: 5,
    respawnX: 400, respawnY: 250,
    invulneravel: false,
    invulneravelTempo: 0,
    powerUps: { velocidade: false, escudo: false },
    collisionPercent: 0.8
};

// Sistema de animação do jacaré
let jacare = {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    speed: 0,
    direcaoX: 1, // 1 = direita, -1 = esquerda
    ondulacao: 0,
    amplitude: 3,
    frequencia: 0.2,
    collisionPercent: 0.85,
    
    ativo: false,
    surgindo: false,
    tempoSurgimento: 0,
    duracaoSurgimento: 60,
    escalaVertical: 0,
    alpha: 0,
    yOffset: 0
};

let peixes = [];
let powerUps = [];
let keys = {};

// MODIFICADO: Adicionar imagem do jacaré virado para esquerda
const imagens = {
    fundo: new Image(),
    player: new Image(),
    inimigo: new Image(),    // Jacaré virado para direita (padrão)
    inimigoEsquerda: new Image(), // Jacaré virado para esquerda
    peixe: new Image()
};

imagens.fundo.src = "imagem/rio.jpeg";
imagens.player.src = "imagem/indio.png";
imagens.inimigo.src = "imagem/jacare.png";      // Jacaré para direita
imagens.inimigoEsquerda.src = "imagem/jacare2.png"; // Jacaré para esquerda
imagens.peixe.src = "imagem/peixe.png";

let imagensCarregadas = 0;
const totalImagens = 5; // MODIFICADO: Agora são 5 imagens

function verificarCarregamento() {
    imagensCarregadas++;
    if (imagensCarregadas === totalImagens) {
        jogoPronto = true;
        iniciarTelaInicial();
        gameLoop();
    }
}

function erroCarregamento(img) {
    console.warn("Erro ao carregar imagem:", img.src);
    imagensCarregadas++;
    if (imagensCarregadas === totalImagens) {
        jogoPronto = true;
        iniciarTelaInicial();
        gameLoop();
    }
}

Object.values(imagens).forEach(img => {
    img.onload = verificarCarregamento;
    img.onerror = () => erroCarregamento(img);
});

setTimeout(() => {
    if (!jogoPronto) {
        jogoPronto = true;
        iniciarTelaInicial();
        gameLoop();
    }
}, 3000);

// Função para desenhar texto com borda suave
function desenharTextoComBorda(texto, x, y, tamanho, corTexto, corBorda, espessuraBorda = 3, isCentralizado = true) {
    ctx.save();
    ctx.font = `bold ${tamanho}px Arial`;
    if (isCentralizado) {
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
    } else {
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
    }
    
    // Borda
    ctx.shadowColor = corBorda;
    ctx.shadowBlur = espessuraBorda;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = corBorda;
    ctx.fillText(texto, x, y);
    
    // Texto principal
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = corTexto;
    ctx.fillText(texto, x, y);
    
    ctx.restore();
}

// Função para iniciar tela inicial
function iniciarTelaInicial() {
    estadoAtual = ESTADO.TELA_INICIAL;
}

// Função para desenhar tela inicial
function desenharTelaInicial() {
    tempoAnimacao += 0.02;
    
    desenharAgua();
    
    // Ondas na água
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
        const y = 150 + i * 200;
        ctx.beginPath();
        for (let x = 0; x < canvas.width; x += 30) {
            const ondaY = y + Math.sin(x * 0.02 + tempoAnimacao * 2 + i) * 15;
            if (x === 0) ctx.moveTo(x, ondaY);
            else ctx.lineTo(x, ondaY);
        }
        ctx.stroke();
    }
    ctx.restore();
    
    // Nome do jogo
    desenharTextoComBorda('Pirá Game', canvas.width/2, 200, 80, '#FFD700', '#000000', 4);
    
    // Frase
    desenharTextoComBorda('Fuja do jacaré e puxe o máximo de peixe', canvas.width/2, 300, 28, '#FFFFFF', '#000000', 3);
    
    // Recorde
    desenharTextoComBorda(`🏆 Recorde: ${highScore} peixes`, canvas.width/2, 380, 24, '#98FB98', '#000000', 2.5);
    
    // Botão de iniciar
    const alpha = 0.7 + Math.sin(tempoAnimacao * 3) * 0.3;
    
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 3;
    ctx.fillStyle = '#4CAF50';
    ctx.beginPath();
    ctx.roundRect(canvas.width/2 - 120, 450, 240, 60, 30);
    ctx.fill();
    ctx.restore();
    
    desenharTextoComBorda('COMEÇAR', canvas.width/2, 480, 28, '#FFFFFF', '#000000', 2.5);
    
    // Instruções
    desenharTextoComBorda('Clique no botão ou pressione ESPAÇO', canvas.width/2, 560, 18, 'rgba(255,255,255,0.7)', '#000000', 2);
    desenharTextoComBorda('Setas: Mover | P: Pausar | M: Música', canvas.width/2, 590, 16, 'rgba(255,255,255,0.7)', '#000000', 1.5);
    
    // Peixes decorativos
    ctx.save();
    ctx.translate(150, 150 + Math.sin(tempoAnimacao) * 10);
    if (imagens.peixe.complete) {
        ctx.drawImage(imagens.peixe, -30, -20, 60, 50);
    }
    ctx.restore();
    
    ctx.save();
    ctx.translate(canvas.width - 150, canvas.height - 150 + Math.cos(tempoAnimacao) * 10);
    ctx.scale(-1, 1);
    if (imagens.peixe.complete) {
        ctx.drawImage(imagens.peixe, -30, -20, 60, 50);
    }
    ctx.restore();
    
    // Silhueta do jacaré (usando imagem padrão)
    ctx.save();
    ctx.globalAlpha = 0.1;
    ctx.translate(canvas.width/2 + Math.sin(tempoAnimacao * 0.5) * 50, 450);
    ctx.scale(2, 1);
    if (imagens.inimigo.complete) {
        ctx.drawImage(imagens.inimigo, -60, -30, 120, 60);
    }
    ctx.restore();
}

// Função auxiliar para retângulos arredondados
CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    this.moveTo(x + r, y);
    this.lineTo(x + w - r, y);
    this.quadraticCurveTo(x + w, y, x + w, y + r);
    this.lineTo(x + w, y + h - r);
    this.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.lineTo(x + r, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - r);
    this.lineTo(x, y + r);
    this.quadraticCurveTo(x, y, x + r, y);
    return this;
};

// Função para iniciar jogo
function iniciarJogo() {
    estadoAtual = ESTADO.JOGANDO;
    resetarJogo();
}

// Evento de clique
document.addEventListener("click", (e) => {
    if (estadoAtual === ESTADO.TELA_INICIAL) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        if (x >= canvas.width/2 - 120 && x <= canvas.width/2 + 120 &&
            y >= 450 && y <= 510) {
            iniciarJogo();
        }
    }
});

// Evento de teclado
document.addEventListener("keydown", (e) => {
    if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key)) e.preventDefault();
    keys[e.key] = true;
    
    if (estadoAtual === ESTADO.TELA_INICIAL) {
        if (e.key === " " || e.key === "Space") {
            e.preventDefault();
            iniciarJogo();
        }
    } else if (estadoAtual === ESTADO.JOGANDO) {
        if(e.key === "p" || e.key === "P") {
            estadoAtual = gamePaused ? ESTADO.JOGANDO : ESTADO.PAUSADO;
            gamePaused = !gamePaused;
        }
        if(e.key === "r" || e.key === "R") resetarJogo();
        if(e.key === "m" || e.key === "M") {
            if (musicaFundo.paused) {
                musicaFundo.play().catch(() => {});
            } else {
                musicaFundo.pause();
            }
        }
    } else if (estadoAtual === ESTADO.PAUSADO) {
        if(e.key === "p" || e.key === "P") {
            estadoAtual = ESTADO.JOGANDO;
            gamePaused = false;
        }
    } else if (estadoAtual === ESTADO.GAME_OVER || estadoAtual === ESTADO.VITORIA) {
        if(e.key === "r" || e.key === "R") {
            estadoAtual = ESTADO.TELA_INICIAL;
            iniciarTelaInicial();
        }
    }
});

document.addEventListener("keyup", (e) => keys[e.key] = false);

function criarPowerUp(x, y) {
    const tipos = ['velocidade', 'vida', 'invulnerabilidade', 'escudo'];
    return { 
        x, y, 
        width: 30, 
        height: 30, 
        tipo: tipos[Math.floor(Math.random()*tipos.length)], 
        ativo: true,
        oscilacao: 0
    };
}

function desenharPowerUp(p) {
    if (!p.ativo) return;
    
    p.oscilacao += 0.05;
    const yOffset = Math.sin(p.oscilacao) * 5;
    
    ctx.save();
    ctx.translate(p.x + p.width/2, p.y + p.height/2 + yOffset);
    
    const cores = { 
        velocidade: '#00FFFF', 
        vida: '#FF69B4', 
        invulnerabilidade: '#FFD700',
        escudo: '#87CEEB'
    };
    
    ctx.fillStyle = cores[p.tipo];
    ctx.fillRect(-p.width/2, -p.height/2, p.width, p.height);
    
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.strokeRect(-p.width/2, -p.height/2, p.width, p.height);
    
    ctx.fillStyle = "white";
    ctx.font = "20px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    
    const simbolos = { 
        velocidade: '⚡', 
        vida: '❤️', 
        invulnerabilidade: '🛡️',
        escudo: '🛡️'
    };
    
    ctx.fillText(simbolos[p.tipo], 0, 0);
    ctx.restore();
}

function ativarPowerUp(tipo) {
    if (tipo === 'velocidade') {
        player.speed = player.baseSpeed * 2;
        player.powerUps.velocidade = true;
        setTimeout(() => { 
            player.speed = player.baseSpeed; 
            player.powerUps.velocidade = false; 
        }, POWER_UP_DURACAO);
    } else if (tipo === 'vida') {
        lives = Math.min(lives + 1, 5);
    } else if (tipo === 'invulnerabilidade' || tipo === 'escudo') {
        player.invulneravel = true;
        player.powerUps.escudo = true;
        setTimeout(() => {
            player.invulneravel = false;
            player.powerUps.escudo = false;
        }, POWER_UP_DURACAO);
    }
}

// Função para criar jacaré
function criarJacare() {
    const velocidadeBase = 1.2 + (fase * 0.4);
    const tamanhoBase = 90 + (fase * 2);
    
    const xInicial = Math.random() * (canvas.width - tamanhoBase);
    const yInicial = canvas.height - 20;
    
    return {
        x: xInicial,
        y: yInicial,
        width: tamanhoBase,
        height: 45 + (fase * 1),
        speed: velocidadeBase,
        direcaoX: 1, // Será atualizado dinamicamente
        ondulacao: 0,
        amplitude: 3 + (fase * 0.2),
        frequencia: 0.2,
        collisionPercent: 0.85,
        
        ativo: true,
        surgindo: true,
        tempoSurgimento: 0,
        duracaoSurgimento: 60,
        escalaVertical: 0,
        alpha: 0,
        yOffset: 0
    };
}

// Função para perseguir jogador
function perseguirJogador() {
    if (!jacare) return;
    
    jacare.ondulacao += jacare.frequencia * jacare.speed;
    
    const centroJacareX = jacare.x + jacare.width/2;
    const centroJacareY = jacare.y + jacare.height/2;
    const centroPlayerX = player.x + player.size/2;
    const centroPlayerY = player.y + player.size/2;
    
    // Atualizar direção - Jacaré sempre vira para o índio
    jacare.direcaoX = centroPlayerX > centroJacareX ? 1 : -1;
    
    const dx = centroPlayerX - centroJacareX;
    const dy = centroPlayerY - centroJacareY;
    const distancia = Math.sqrt(dx * dx + dy * dy);
    
    if (distancia > 5) {
        const desvioX = Math.cos(jacare.ondulacao) * jacare.amplitude * 0.2;
        const desvioY = Math.sin(jacare.ondulacao) * jacare.amplitude * 0.2;
        
        const moveX = (dx / distancia) * jacare.speed;
        const moveY = (dy / distancia) * jacare.speed;
        
        jacare.x += moveX + desvioX;
        jacare.y += moveY + desvioY;
    }
    
    jacare.x = Math.max(0, Math.min(jacare.x, canvas.width - jacare.width));
    jacare.y = Math.max(0, Math.min(jacare.y, canvas.height - jacare.height));
}

// MODIFICADO: Função para desenhar jacaré usando a imagem correta baseada na direção
function desenharJacare() {
    if (!jacare || !jacare.ativo) return;
    
    ctx.save();
    ctx.globalAlpha = jacare.alpha;
    
    ctx.translate(jacare.x + jacare.width/2, jacare.y + jacare.height/2 - jacare.yOffset);
    
    if (jacare.surgindo) {
        ctx.scale(1, jacare.escalaVertical);
    }
    
    const rotacao = Math.sin(jacare.ondulacao) * 0.05;
    ctx.rotate(rotacao);
    
    // Escolher a imagem baseada na direção
    let imagemJacare;
    if (jacare.direcaoX === 1) {
        imagemJacare = imagens.inimigo; // Jacaré virado para direita
    } else {
        imagemJacare = imagens.inimigoEsquerda; // Jacaré virado para esquerda
    }
    
    if (imagemJacare && imagemJacare.complete) {
        ctx.drawImage(imagemJacare, -jacare.width/2, -jacare.height/2, jacare.width, jacare.height);
    } else {
        // Fallback colorido se a imagem não carregar
        ctx.fillStyle = '#228B22';
        ctx.fillRect(-jacare.width/2, -jacare.height/2, jacare.width, jacare.height);
    }
    
    ctx.restore();
}

function criarPeixe() {
    const tipos = ['comum', 'dourado', 'rapido'];
    const tipo = tipos[Math.floor(Math.random() * (fase > 3 ? 3 : 1))];
    
    let velocidade = 0;
    let pontos = 1;
    
    switch(tipo) {
        case 'dourado':
            velocidade = 1;
            pontos = 3;
            break;
        case 'rapido':
            velocidade = 2;
            pontos = 2;
            break;
        default:
            velocidade = 0.5;
            pontos = 1;
    }
    
    return {
        x: Math.random() * (canvas.width - 40),
        y: Math.random() * (canvas.height - 35),
        width: 35,
        height: 30,
        tipo: tipo,
        pontos: pontos,
        velocidade: velocidade,
        direcao: Math.random() > 0.5 ? 1 : -1,
        ativo: true,
        ondulacao: Math.random() * Math.PI * 2,
        collisionPercent: 0.9
    };
}

function getMetaFase() {
    return fase * 10;
}

function iniciarFase() {
    powerUps = [];
    peixes = [];
    jacare = criarJacare();
    
    let quantidadePeixes = Math.min(5 + fase, 15);
    for (let i = 0; i < quantidadePeixes; i++) {
        peixes.push(criarPeixe());
    }
    
    mostrarMensagemNivel();
}

function iniciarContagemRegressiva() {
    faseAguardando = true;
    contagemRegressiva = 3;
    player.invulneravel = true;
    
    player.powerUps.velocidade = false;
    player.speed = player.baseSpeed;
    
    if (fase > 1 || peixesPescados > 0) {
        powerUps = [];
        peixes = [];
        jacare = { ativo: false };
    }
    
    const intervalo = setInterval(() => {
        contagemRegressiva--;
        
        if (contagemRegressiva === 0) {
            clearInterval(intervalo);
            faseAguardando = false;
            player.invulneravel = false;
            iniciarFase();
        }
    }, 1000);
}

function mostrarMensagemNivel() {
    mensagemNivel = `FASE ${fase}!`;
    mensagemTempo = 90;
}

function checkCollision(obj1, obj2) {
    const obj1Width = obj1.width || obj1.size;
    const obj1Height = obj1.height || obj1.size;
    const obj2Width = obj2.width || obj2.size;
    const obj2Height = obj2.height || obj2.size;
    
    const obj1CenterX = obj1.x + obj1Width/2;
    const obj1CenterY = obj1.y + obj1Height/2;
    const obj2CenterX = obj2.x + obj2Width/2;
    const obj2CenterY = obj2.y + obj2Height/2;
    
    const obj1CollisionWidth = obj1Width * (obj1.collisionPercent || 1);
    const obj1CollisionHeight = obj1Height * (obj1.collisionPercent || 1);
    const obj2CollisionWidth = obj2Width * (obj2.collisionPercent || 1);
    const obj2CollisionHeight = obj2Height * (obj2.collisionPercent || 1);
    
    const obj1CollisionX = obj1CenterX - obj1CollisionWidth/2;
    const obj1CollisionY = obj1CenterY - obj1CollisionHeight/2;
    const obj2CollisionX = obj2CenterX - obj2CollisionWidth/2;
    const obj2CollisionY = obj2CenterY - obj2CollisionHeight/2;
    
    return obj1CollisionX < obj2CollisionX + obj2CollisionWidth &&
           obj1CollisionX + obj1CollisionWidth > obj2CollisionX &&
           obj1CollisionY < obj2CollisionY + obj2CollisionHeight &&
           obj1CollisionY + obj1CollisionHeight > obj2CollisionY;
}

function resetarJogo() {
    if (peixesPescados > highScore) {
        highScore = peixesPescados;
        localStorage.setItem('highScore', highScore);
    }
    
    peixesPescados = 0;
    lives = 3;
    fase = 1;
    gameOver = false;
    gameWin = false;
    gamePaused = false;
    faseAguardando = true;
    contagemRegressiva = 3;
    player.x = player.respawnX;
    player.y = player.respawnY;
    player.speed = player.baseSpeed;
    player.invulneravel = true;
    player.powerUps = { velocidade: false, escudo: false };
    powerUps = [];
    peixes = [];
    jacare = { ativo: false };
    
    setTimeout(() => {
        if (!gameOver && !gameWin) {
            iniciarContagemRegressiva();
        }
    }, 500);
    
    musicaFundo.play().catch(() => {});
}

function desenharAgua() {
    agua.offset += agua.velocidade;
    
    ctx.save();
    
    ctx.beginPath();
    ctx.rect(0, 0, canvas.width, canvas.height);
    ctx.clip();
    
    if (imagens.fundo.complete) {
        ctx.drawImage(imagens.fundo, 0, 0, canvas.width, canvas.height);
    } else {
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#1E90FF');
        gradient.addColorStop(0.5, '#4169E1');
        gradient.addColorStop(1, '#000080');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    ctx.restore();
}

function atualizarSurgimentoJacare() {
    if (!jacare || !jacare.surgindo) return;
    
    jacare.tempoSurgimento++;
    
    const progresso = Math.min(jacare.tempoSurgimento / jacare.duracaoSurgimento, 1);
    const progressoSuave = Math.sin(progresso * Math.PI / 2);
    
    jacare.escalaVertical = progressoSuave;
    jacare.alpha = progresso;
    jacare.yOffset = (1 - progressoSuave) * 40;
    
    if (jacare.tempoSurgimento >= jacare.duracaoSurgimento) {
        jacare.surgindo = false;
        jacare.escalaVertical = 1;
        jacare.alpha = 1;
        jacare.yOffset = 0;
    }
}

function update() {
    if (!jogoPronto) return;
    
    if (estadoAtual !== ESTADO.JOGANDO) return;
    
    if (gameOver || gamePaused || gameWin || faseAguardando) return;

    if (keys["ArrowUp"] && player.y > 0) {
        player.y -= player.speed;
    }
    if (keys["ArrowDown"] && player.y + player.size < canvas.height) {
        player.y += player.speed;
    }
    if (keys["ArrowLeft"] && player.x > 0) {
        player.x -= player.speed;
    }
    if (keys["ArrowRight"] && player.x + player.size < canvas.width) {
        player.x += player.speed;
    }

    powerUps = powerUps.filter(p => p.ativo);
    powerUps.forEach(p => {
        if (checkCollision(player, p)) {
            ativarPowerUp(p.tipo);
            p.ativo = false;
        }
    });

    peixes.forEach(peixe => {
        if (peixe.velocidade > 0) {
            peixe.ondulacao += 0.1;
            peixe.x += peixe.velocidade * peixe.direcao;
            
            if (peixe.x < 0 || peixe.x + peixe.width > canvas.width) {
                peixe.direcao *= -1;
            }
        }
    });

    if (jacare && jacare.ativo) {
        if (jacare.surgindo) {
            atualizarSurgimentoJacare();
        }
        
        if (!jacare.surgindo) {
            perseguirJogador();
        }

        if (!jacare.surgindo && !player.invulneravel) {
            if (checkCollision(jacare, player)) {
                lives--;
                
                player.invulneravel = true;
                player.x = player.respawnX;
                player.y = player.respawnY;
                
                setTimeout(() => {
                    player.invulneravel = false;
                }, INVULNERABILIDADE_TEMPO);

                if (lives <= 0) {
                    gameOver = true;
                    estadoAtual = ESTADO.GAME_OVER;
                    musicaFundo.pause();
                    
                    if (peixesPescados > highScore) {
                        highScore = peixesPescados;
                        localStorage.setItem('highScore', highScore);
                    }
                }
            }
        }
    }

    peixes.forEach(peixe => {
        if (peixe.ativo && checkCollision(player, peixe)) {
            peixesPescados += peixe.pontos;
            peixe.ativo = false;
            
            if (Math.random() < POWER_UP_CHANCE) {
                powerUps.push(criarPowerUp(peixe.x, peixe.y));
            }
        }
    });
    
    peixes = peixes.filter(p => p.ativo);
    
    let quantidadePeixesDesejada = Math.min(5 + fase, 15);
    while (peixes.length < quantidadePeixesDesejada) {
        peixes.push(criarPeixe());
    }

    const meta = getMetaFase();
    if (peixesPescados >= meta && fase < MAX_FASE && !faseAguardando) {
        fase++;
        iniciarContagemRegressiva();
    } else if (peixesPescados >= meta && fase >= MAX_FASE) {
        gameWin = true;
        estadoAtual = ESTADO.VITORIA;
        musicaFundo.pause();
        
        if (peixesPescados > highScore) {
            highScore = peixesPescados;
            localStorage.setItem('highScore', highScore);
        }
    }
    
    if (mensagemTempo > 0) {
        mensagemTempo--;
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (estadoAtual === ESTADO.TELA_INICIAL) {
        desenharTelaInicial();
        return;
    }
    
    desenharAgua();

    if (estadoAtual === ESTADO.GAME_OVER) {
        ctx.fillStyle = "rgba(0,0,0,0.8)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "white";
        ctx.font = "bold 48px Arial";
        ctx.fillText("GAME OVER", canvas.width/2-140, canvas.height/2-50);
        ctx.font = "24px Arial";
        ctx.fillText(`Total: ${peixesPescados} peixes`, canvas.width/2-100, canvas.height/2);
        ctx.fillText(`High Score: ${highScore}`, canvas.width/2-80, canvas.height/2+40);
        ctx.fillStyle = "#FFD700";
        ctx.font = "20px Arial";
        ctx.fillText("Pressione R para voltar à tela inicial", canvas.width/2-170, canvas.height/2+100);
        return;
    }

    if (estadoAtual === ESTADO.VITORIA) {
        ctx.fillStyle = "rgba(0,0,0,0.8)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#FFD700";
        ctx.font = "bold 48px Arial";
        ctx.fillText("VITÓRIA!", canvas.width/2-120, canvas.height/2-50);
        ctx.fillStyle = "white";
        ctx.font = "24px Arial";
        ctx.fillText(`Total: ${peixesPescados} peixes`, canvas.width/2-100, canvas.height/2);
        ctx.fillText(`Fases: ${MAX_FASE}`, canvas.width/2-50, canvas.height/2+40);
        ctx.fillStyle = "#FFD700";
        ctx.font = "20px Arial";
        ctx.fillText("Pressione R para voltar à tela inicial", canvas.width/2-170, canvas.height/2+100);
        return;
    }

    if (estadoAtual === ESTADO.PAUSADO) {
        desenharAgua();
        ctx.globalAlpha = 0.3;
        desenharElementosJogo();
        ctx.globalAlpha = 1;
        
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "white";
        ctx.font = "bold 48px Arial";
        ctx.fillText("PAUSADO", canvas.width/2-130, canvas.height/2);
        ctx.font = "20px Arial";
        ctx.fillText("Pressione P para continuar", canvas.width/2-120, canvas.height/2+50);
        return;
    }

    desenharElementosJogo();
}

function desenharElementosJogo() {
    if (!faseAguardando) {
        powerUps.forEach(desenharPowerUp);
    }

    if (!faseAguardando) {
        peixes.forEach(peixe => {
            ctx.save();
            if (imagens.peixe.complete) {
                ctx.translate(peixe.x + peixe.width/2, peixe.y + peixe.height/2);
                ctx.rotate(Math.sin(peixe.ondulacao) * 0.03);
                ctx.drawImage(imagens.peixe, -peixe.width/2, -peixe.height/2, peixe.width, peixe.height);
            } else {
                ctx.fillStyle = peixe.tipo === 'dourado' ? '#FFD700' : (peixe.tipo === 'rapido' ? '#00FFFF' : '#FFA500');
                ctx.fillRect(peixe.x, peixe.y, peixe.width, peixe.height);
            }
            ctx.restore();
        });
    }

    if (jacare && jacare.ativo) {
        desenharJacare();
    }

    ctx.save();
    if (player.invulneravel || faseAguardando) {
        ctx.globalAlpha = 0.5 + Math.sin(Date.now()*0.01)*0.3;
    }
    if (player.powerUps.escudo) {
        ctx.beginPath();
        ctx.arc(player.x + player.size/2, player.y + player.size/2, player.size/2 + 5, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255, 215, 0, 0.5)";
        ctx.lineWidth = 3;
        ctx.stroke();
    }
    
    if (imagens.player.complete) {
        ctx.drawImage(imagens.player, player.x, player.y, player.size, player.size);
    } else {
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(player.x, player.y, player.size, player.size);
    }
    ctx.restore();

    const meta = getMetaFase();
    
    ctx.fillStyle = "white";
    ctx.shadowColor = "black";
    ctx.shadowBlur = 4;
    ctx.font = "bold 20px Arial";
    ctx.fillText(`🐟 ${peixesPescados}`, 20, 30);
    ctx.fillText(`❤️ ${lives}`, 20, 55);
    ctx.fillText(`🏆 ${highScore}`, 20, 80);
    ctx.fillText(`Fase ${fase}/${MAX_FASE}`, canvas.width-120, 30);
    ctx.fillText(`🎯 ${meta}`, canvas.width-120, 55);
    
    if (faseAguardando && contagemRegressiva > 0) {
        ctx.save();
        ctx.font = "bold 36px Arial";
        ctx.fillStyle = "#FFD700";
        ctx.textAlign = "center";
        ctx.fillText(`FASE ${fase}`, canvas.width/2, canvas.height/2 - 100);
        
        ctx.font = "bold 120px Arial";
        
        if (contagemRegressiva === 3) {
            ctx.fillStyle = "#98FB98";
        } else if (contagemRegressiva === 2) {
            ctx.fillStyle = "#FFA500";
        } else if (contagemRegressiva === 1) {
            ctx.fillStyle = "#FF6346";
        }
        
        ctx.fillText(contagemRegressiva.toString(), canvas.width/2, canvas.height/2 + 20);
        
        ctx.font = "24px Arial";
        ctx.fillStyle = "white";
        ctx.fillText("Prepare-se...", canvas.width/2, canvas.height/2 + 100);
        
        ctx.restore();
    } else if (mensagemTempo > 0 && !faseAguardando) {
        ctx.save();
        ctx.font = "bold 48px Arial";
        ctx.fillStyle = "#FFD700";
        ctx.textAlign = "center";
        ctx.fillText(mensagemNivel, canvas.width/2, canvas.height/2 - 50);
        
        ctx.font = "24px Arial";
        ctx.fillStyle = "white";
        ctx.fillText("Vai!", canvas.width/2, canvas.height/2 + 10);
        ctx.restore();
    }
    
    ctx.shadowBlur = 0;
    ctx.font = "14px Arial";
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillText("Setas: Mover | P: Pausar | M: Música | R: Reiniciar", canvas.width/2-200, canvas.height-20);
}

function gameLoop() {
    try { 
        update(); 
        draw(); 
    } catch (e) { 
        console.log("Erro no loop:", e); 
    }
    requestAnimationFrame(gameLoop);
}

};