const searchBtn = document.getElementById('searchBtn');
const searchInput = document.getElementById('searchInput');
const wordInfo = document.getElementById('wordInfo');
const wordTitle = document.getElementById('wordTitle');
const phonetics = document.getElementById('phonetics');
const definitions = document.getElementById('definitions');
const examples = document.getElementById('examples');
const synonyms = document.getElementById('synonyms');
const antonyms = document.getElementById('antonyms');
const playSound = document.getElementById('playSound');
const translationDiv = document.getElementById('translation');
const languageSelect = document.getElementById('languageSelect');
const historyList = document.getElementById('historyList');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const relatedImagesDiv = document.getElementById('relatedImages');
const micBtn = document.getElementById('micBtn');

let audio = null;
let history = JSON.parse(localStorage.getItem('searchHistory')) || [];

searchBtn.addEventListener('click', () => {
  const word = searchInput.value.trim();
  if (word) {
    fetchWordData(word);
    updateHistory(word);
  }
});

searchInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') searchBtn.click();
});

document.getElementById("darkModeToggle").addEventListener("click", () => {
  document.body.classList.toggle("dark");
  localStorage.setItem("darkMode", document.body.classList.contains("dark"));
});

window.addEventListener("DOMContentLoaded", () => {
  if (localStorage.getItem("darkMode") === "true") {
    document.body.classList.add("dark");
  }
  renderHistory();
});

clearHistoryBtn.addEventListener('click', () => {
  if (confirm("Clear search history?")) {
    history = [];
    localStorage.removeItem('searchHistory');
    renderHistory();
  }
});

historyList.addEventListener('click', (e) => {
  if (e.target.tagName === 'LI') {
    const word = e.target.textContent;
    fetchWordData(word);
  }
});

function updateHistory(word) {
  if (!history.includes(word)) {
    history.push(word);
    localStorage.setItem('searchHistory', JSON.stringify(history));
    renderHistory();
  }
}

function renderHistory() {
  historyList.innerHTML = '';
  history.forEach(w => {
    const li = document.createElement('li');
    li.textContent = w;
    historyList.appendChild(li);
  });
}

async function fetchWordData(word) {
  const cacheKey = `word_${word.toLowerCase()}`;

  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
    if (!res.ok) throw new Error('Fetch failed');
    const data = await res.json();

    if (data.title === "No Definitions Found") {
      wordInfo.classList.add('hidden');
      alert("Word not found.");
      return;
    }

    localStorage.setItem(cacheKey, JSON.stringify(data));
    displayWordData(data);
  } catch (err) {
    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData) {
      alert('Offline or API unreachable. Loading cached data.');
      displayWordData(JSON.parse(cachedData));
    } else {
      alert("Word not found and no cached data available.");
      wordInfo.classList.add('hidden');
    }
  }
}

function displayWordData(data) {
  const entry = data[0];
  wordInfo.classList.remove('hidden');
  wordTitle.textContent = entry.word;
  phonetics.textContent = entry.phonetics[0]?.text || '';
  audio = new Audio(entry.phonetics[0]?.audio || '');
  playSound.style.display = audio.src ? 'inline' : 'none';

  definitions.innerHTML = `<h3>Definitions:</h3>` +
    entry.meanings.map(m => `<p><strong>${m.partOfSpeech}:</strong> ${m.definitions[0].definition}</p>`).join('');

  examples.innerHTML = `<h3>Examples:</h3>` +
    entry.meanings.map(m => {
      const ex = m.definitions[0].example;
      return ex ? `<p>"${ex}"</p>` : '';
    }).join('');

  const syns = entry.meanings.flatMap(m => m.synonyms);
  synonyms.innerHTML = syns.length ? `<h3>Synonyms:</h3><p>${syns.join(', ')}</p>` : '';

  const ants = entry.meanings.flatMap(m => m.antonyms);
  antonyms.innerHTML = ants.length ? `<h3>Antonyms:</h3><p>${ants.join(', ')}</p>` : '';

  translationDiv.innerHTML = '';
  fetchRelatedImages(entry.word);
}

async function fetchRelatedImages(word) {
  const apiKey = '50329140-a5f985ecd8f676e38555cc27f';
  const url = `https://pixabay.com/api/?key=${apiKey}&q=${encodeURIComponent(word)}&image_type=photo&per_page=4`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.hits && data.hits.length > 0) {
      relatedImagesDiv.innerHTML = '<h3>Related Images:</h3>' +
        data.hits.map(hit =>
          `<img src="${hit.webformatURL}" alt="${word}" style="width:150px; margin:5px; border-radius:8px;"/>`
        ).join('');
    } else {
      relatedImagesDiv.innerHTML = '<p>No images found.</p>';
    }
  } catch (error) {
    relatedImagesDiv.innerHTML = '<p>Error fetching images.</p>';
  }
}


playSound.addEventListener('click', () => {
  if (audio) audio.play();
});

languageSelect.addEventListener('change', () => {
  const selectedLang = languageSelect.value;
  const word = wordTitle.textContent;

  if (selectedLang && word) {
    translateText(word, selectedLang);
  } else {
    translationDiv.innerHTML = `<p>Please search a word first.</p>`;
  }
});

async function translateText(text, lang) {
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${lang}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.responseData && data.responseData.translatedText) {
      translationDiv.innerHTML = `<h3>Translation:</h3><p>${data.responseData.translatedText}</p>`;
    } else {
      translationDiv.innerHTML = `<p>Translation failed. Try again later.</p>`;
    }
  } catch (err) {
    console.error("Translation error:", err);
    translationDiv.innerHTML = `<p>Translation service unreachable or blocked.</p>`;
  }
}

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
  const recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.continuous = false;

  micBtn.addEventListener("click", () => {
    recognition.start();
    micBtn.textContent = "🎙️ Listening...";
  });

  recognition.onresult = function(event) {
    const transcript = event.results[0][0].transcript;
    searchInput.value = transcript;
    micBtn.textContent = "🎤";
    searchBtn.click();
  };

  recognition.onerror = function() {
    micBtn.textContent = "🎤";
    alert("Voice recognition failed. Try again.");
  };

  recognition.onend = () => {
    micBtn.textContent = "🎤";
  };
} else {
  micBtn.disabled = true;
  micBtn.title = "Speech Recognition not supported";
}

window.addEventListener('offline', () => alert('You are now offline.'));
window.addEventListener('online', () => alert('You are back online.'));
