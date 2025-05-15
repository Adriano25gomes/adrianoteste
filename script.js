
// script.js - COMPLETO com função openTab integrada

// =======================
// FUNÇÃO PARA TROCAR DE ABA
// =======================
function openTab(evt, tabName) {
    const tabcontent = document.getElementsByClassName("tabcontent");
    for (let i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }
    const tablinks = document.getElementsByClassName("tablinks");
    for (let i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }
    document.getElementById(tabName).style.display = "block";
    evt.currentTarget.className += " active";
}

// =======================
// SCROLL E LOADER
// =======================
function scrollPara(id) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
}

function mostrarLoader(id, mostrar = true) {
    const loader = document.getElementById(id);
    if (loader) loader.style.display = mostrar ? 'block' : 'none';
}

// =======================
// VALIDAÇÃO NUMÉRICA
// =======================
function validarNumero(valor, padrao = 0) {
    const n = parseFloat(valor);
    return isNaN(n) ? padrao : n;
}

// =======================
// HISTÓRICO
// =======================
function salvarPrevisaoHistorico(previsao) {
    const historico = JSON.parse(localStorage.getItem('historico-previsoes') || '[]');
    historico.push({ ...previsao, data: new Date().toISOString() });
    localStorage.setItem('historico-previsoes', JSON.stringify(historico));
}

function carregarHistorico() {
    const historico = JSON.parse(localStorage.getItem('historico-previsoes') || '[]');
    const tabela = document.querySelector('#tabela-historico tbody');
    if (!tabela) return;
    tabela.innerHTML = '';
    historico.slice().reverse().forEach(item => {
        const tr = document.createElement('tr');
        const colunas = [
            new Date(item.data).toLocaleDateString(),
            item.partida || '-',
            item.handicap || '-',
            item.previsao || '-',
            item.resultado || '-',
            item.retorno || '-'
        ];
        colunas.forEach(val => {
            const td = document.createElement('td');
            td.textContent = val;
            tr.appendChild(td);
        });
        tabela.appendChild(tr);
    });
}

// =======================
// PREVISÃO DE PLACAR
// =======================
async function preverPlacarCorreto() {
    const casaId = document.getElementById('time-placar-casa').value;
    const foraId = document.getElementById('time-placar-fora').value;
    const modo = document.getElementById('modo-previsao').value;

    if (!casaId || !foraId) {
        mostrarAlerta('Selecione os times para previsão de placar.', 'warning');
        return;
    }

    mostrarLoader('loader', true);
    document.getElementById('resultado-placar').style.display = 'none';

    try {
        const jogosCasa = await buscarUltimosJogos(casaId);
        const jogosFora = await buscarUltimosJogos(foraId);

        const mediaCasa = calcularMediaGols(jogosCasa, 'casa');
        const mediaFora = calcularMediaGols(jogosFora, 'fora');

        const placares = simularPlacarProbabilidades(mediaCasa, mediaFora);
        await exibirPlacaresProvaveis(placares, casaId, foraId);
        scrollPara('resultado-placar');
    } catch (erro) {
        mostrarAlerta('Erro ao prever placares: ' + erro.message, 'error');
    } finally {
        mostrarLoader('loader', false);
    }
}

function calcularMediaGols(jogos, lado) {
    let total = 0;
    jogos.forEach(j => {
        total += lado === 'casa' ? j.score.fullTime.home : j.score.fullTime.away;
    });
    return jogos.length ? total / jogos.length : 1;
}

function simularPlacarProbabilidades(mediaCasa, mediaFora) {
    const resultados = [];
    for (let golsCasa = 0; golsCasa <= 4; golsCasa++) {
        for (let golsFora = 0; golsFora <= 4; golsFora++) {
            const prob = Math.exp(-mediaCasa) * Math.pow(mediaCasa, golsCasa) / fatorial(golsCasa)
                        * Math.exp(-mediaFora) * Math.pow(mediaFora, golsFora) / fatorial(golsFora);
            resultados.push({
                casa: golsCasa,
                fora: golsFora,
                probabilidade: prob
            });
        }
    }
    return resultados.sort((a, b) => b.probabilidade - a.probabilidade).slice(0, 3);
}

function fatorial(n) {
    return n <= 1 ? 1 : n * fatorial(n - 1);
}

async function exibirPlacaresProvaveis(placares, casaId, foraId) {
    const nomeCasa = await buscarNomeTime(casaId);
    const nomeFora = await buscarNomeTime(foraId);

    placares.forEach((placar, idx) => {
        document.getElementById(`time1-placar${idx + 1}`).textContent = nomeCasa;
        document.getElementById(`time2-placar${idx + 1}`).textContent = nomeFora;
        document.getElementById(`gols1-placar${idx + 1}`).textContent = placar.casa;
        document.getElementById(`gols2-placar${idx + 1}`).textContent = placar.fora;
        document.getElementById(`prob-placar${idx + 1}`).textContent = (placar.probabilidade * 100).toFixed(1) + '%';
    });

    document.getElementById('resultado-placar').style.display = 'block';
}

async function buscarNomeTime(timeId) {
    try {
        const url = `https://simulador-final.onrender.com/api/teams/${timeId}`;
        const resp = await fetch(url, { headers: { 'X-Auth-Token': apiKey } });
        const data = await resp.json();
        return data.name;
    } catch {
        return 'Time';
    }
}

function mostrarAlerta(msg, tipo = 'info') {
    let alerta = document.getElementById('alerta-sistema');
    if (!alerta) {
        alerta = document.createElement('div');
        alerta.id = 'alerta-sistema';
        alerta.className = 'alerta';
        document.querySelector('.container').prepend(alerta);
    }
    alerta.className = `alerta alerta-${tipo}`;
    alerta.textContent = msg;
    alerta.style.display = 'block';
    setTimeout(() => alerta.style.display = 'none', 5000);
}
