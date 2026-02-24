<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Guerreiro Pescador</title>
<style>
body { margin:0; overflow:hidden; }
canvas { display:block; margin:0 auto; background:#1e90ff; }
</style>
</head>
<body>

<canvas id="gameCanvas" width="900" height="500"></canvas>

<script>
window.onload = function () {

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// ======================
// VARIÁVEIS
// ======================

let peixes = 0;
let gameOver = false;

let paralisado = false;
let tempoParalisado = 0;

let poderMagnetico = false;
let tempoMagnetico = 0;

let camaroes = [];

// ======================
// JOGADOR
// ======================

const pescador = {
    x:100,
    y:250,
    largura:40,
    altura:40,
    velocidade:5
};

// ======================
// JACARÉ
// ======================

const jacare = {
    x:900,
    y:200,
    largura:80,
    altura:40,
    velocidade:3
};

// ======================
// ARRAIA
// ======================

const arraia = {
    x:400,
    y:300,
    largura:60,
    altura:40
};

// ======================
// TECLADO
// ======================

let teclas = {};
document.addEventListener("keydown", e => teclas[e.key] = true);
document.addEventListener("keyup", e => teclas[e.key] = false);

// ======================
// CRIAR CAMARÃO
// ======================

function criarCamarao(){

    let tipo = "normal";
    let sorte = Math.random();

    if(sorte < 0.05){
        tipo = "gigante";
    }
    else if(sorte < 0.20){
        tipo = "dourado";
    }

    camaroes.push({
        x:Math.random()*(canvas.width-60),
        y:Math.random()*(canvas.height-60),
        largura: tipo==="gigante"?50:30,
        altura: tipo==="gigante"?35:20,
        tipo:tipo
    });
}

// ======================
// COLISÃO
// ======================

function colidiu(a,b){
    return a.x < b.x + b.largura &&
           a.x + a.largura > b.x &&
           a.y < b.y + b.altura &&
           a.y + a.altura > b.y;
}

// ======================
// ATUALIZAR
// ======================

function atualizar(){

if(gameOver) return;

// Movimento jogador
if(!paralisado){
    if(teclas["ArrowUp"]) pescador.y -= pescador.velocidade;
    if(teclas["ArrowDown"]) pescador.y += pescador.velocidade;
    if(teclas["ArrowLeft"]) pescador.x -= pescador.velocidade;
    if(teclas["ArrowRight"]) pescador.x += pescador.velocidade;
}

// Limites
pescador.x = Math.max(0, Math.min(canvas.width - pescador.largura, pescador.x));
pescador.y = Math.max(0, Math.min(canvas.height - pescador.altura, pescador.y));

// Jacaré
jacare.x -= jacare.velocidade;
if(jacare.x < -80){
    jacare.x = canvas.width;
    jacare.y = Math.random()*(canvas.height-40);
}

if(colidiu(pescador,jacare)){
    gameOver = true;
    alert("O jacaré pegou você!");
}

// Arraia
if(colidiu(pescador,arraia) && !paralisado){
    peixes = Math.max(0, peixes-5);
    paralisado = true;
    tempoParalisado = Date.now();

    arraia.x = Math.random()*(canvas.width-60);
    arraia.y = Math.random()*(canvas.height-40);
}

if(paralisado && Date.now()-tempoParalisado > 3000){
    paralisado = false;
}

// Spawn camarão
if(camaroes.length < 6 && Math.random()<0.04){
    criarCamarao();
}

// Poder magnético
if(poderMagnetico){

    for(let c of camaroes){

        let dx = pescador.x - c.x;
        let dy = pescador.y - c.y;
        let dist = Math.sqrt(dx*dx + dy*dy);

        if(dist < 200){
            c.x += dx*0.05;
            c.y += dy*0.05;
        }
    }

    if(Date.now()-tempoMagnetico > 5000){
        poderMagnetico = false;
    }
}

// Colisão camarões
for(let i=camaroes.length-1;i>=0;i--){

    let c = camaroes[i];

    if(colidiu(pescador,c)){

        if(c.tipo==="gigante"){
            peixes += 20;
            poderMagnetico = true;
            tempoMagnetico = Date.now();
        }
        else if(c.tipo==="dourado"){
            peixes += 10;
        }
        else{
            peixes += 1;
        }

        camaroes.splice(i,1);
    }
}

}

// ======================
// DESENHAR
// ======================

function desenhar(){

ctx.clearRect(0,0,canvas.width,canvas.height);

// Pescador
ctx.fillStyle = paralisado ? "#00ffff":"brown";
ctx.fillRect(pescador.x,pescador.y,pescador.largura,pescador.altura);

// Efeito choque
if(paralisado){
    ctx.strokeStyle="yellow";
    for(let i=0;i<6;i++){
        ctx.beginPath();
        ctx.moveTo(pescador.x+Math.random()*40,pescador.y+Math.random()*40);
        ctx.lineTo(pescador.x+Math.random()*40,pescador.y+Math.random()*40);
        ctx.stroke();
    }
}

// Campo magnético
if(poderMagnetico){
    ctx.beginPath();
    ctx.strokeStyle="cyan";
    ctx.arc(
        pescador.x+pescador.largura/2,
        pescador.y+pescador.altura/2,
        100,0,Math.PI*2
    );
    ctx.stroke();
}

// Jacaré
ctx.fillStyle="green";
ctx.fillRect(jacare.x,jacare.y,jacare.largura,jacare.altura);

// Arraia
ctx.fillStyle="black";
ctx.beginPath();
ctx.moveTo(arraia.x,arraia.y+arraia.altura/2);
ctx.lineTo(arraia.x+arraia.largura/2,arraia.y);
ctx.lineTo(arraia.x+arraia.largura,arraia.y+arraia.altura/2);
ctx.lineTo(arraia.x+arraia.largura/2,arraia.y+arraia.altura);
ctx.closePath();
ctx.fill();

// Camarões
for(let c of camaroes){

    if(c.tipo==="gigante"){
        ctx.fillStyle="orange";
    }
    else if(c.tipo==="dourado"){
        ctx.fillStyle="gold";
    }
    else{
        ctx.fillStyle="pink";
    }

    ctx.beginPath();
    ctx.ellipse(c.x,c.y,c.largura,c.altura,0,0,Math.PI*2);
    ctx.fill();

    if(c.tipo==="gigante"){
        ctx.strokeStyle="yellow";
        ctx.lineWidth=3;
        ctx.stroke();
    }
}

// HUD
ctx.fillStyle="white";
ctx.font="20px Arial";
ctx.fillText("Peixes: "+peixes,20,30);

if(paralisado){
    ctx.fillStyle="yellow";
    ctx.fillText("CHOQUE ⚡",380,30);
}

if(poderMagnetico){
    ctx.fillStyle="cyan";
    ctx.fillText("IMÃ ATIVO 🧲",360,60);
}

}

// ======================
// LOOP
// ======================

function loop(){
    atualizar();
    desenhar();
    requestAnimationFrame(loop);
}

loop();

};
</script>

</body>
</html>