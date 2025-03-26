const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

function debugAudio() {
  const debugInfo = {
    "Device": isMobile ? "Mobile" : "Desktop",
    "User Agent": navigator.userAgent,
    "SpeechSynthesis available": 'speechSynthesis' in window,
    "Voices loaded": voices.length,
    "Is speaking": window.speechSynthesis?.speaking,
    "Is paused": window.speechSynthesis?.paused,
    "Current content element": document.querySelector('.site-content') || document.querySelector('.tts-content')
  };
  
  console.log("Audio debugging:", debugInfo);
  
  if (isMobile) {
    const debugBtn = document.createElement('button');
    debugBtn.style.position = 'fixed';
    debugBtn.style.bottom = '80px';
    debugBtn.style.right = '20px';
    debugBtn.style.zIndex = '9999';
    debugBtn.style.padding = '8px';
    debugBtn.style.borderRadius = '50%';
    debugBtn.style.backgroundColor = '#ff5722';
    debugBtn.style.color = 'white';
    debugBtn.style.border = 'none';
    debugBtn.style.width = '40px';
    debugBtn.style.height = '40px';
    debugBtn.style.fontSize = '18px';
    debugBtn.textContent = '🐞';
    
    debugBtn.addEventListener('click', showDebugInfo);
    
    document.body.appendChild(debugBtn);
  }
}

function showDebugInfo() {
  const voicesInfo = voices.map(v => `${v.name} (${v.lang})`).join('\n');
  
  alert(`TTS Debug Info:
- Device: ${isMobile ? "Mobile" : "Desktop"}
- Browser: ${navigator.userAgent}
- Speech API available: ${'speechSynthesis' in window}
- Voices loaded: ${voices.length}
- Selected voice gender: ${voiceGender?.value || 'N/A'}
- Selected accent: ${accent?.value || 'N/A'}
- Speech is active: ${window.speechSynthesis?.speaking || false}
- Content element found: ${Boolean(document.querySelector('.site-content') || document.querySelector('.tts-content'))}
  `);
}

if (!window.speechSynthesis) {
  console.error("Speech Synthesis API is not available in this browser");
  document.addEventListener('DOMContentLoaded', function() {
    const warning = document.createElement('div');
    warning.style.padding = "10px";
    warning.style.margin = "10px 0";
    warning.style.backgroundColor = "#fff3cd";
    warning.style.color = "#856404";
    warning.style.borderLeft = "5px solid #ffeeba";
    warning.style.borderRadius = "3px";
    warning.innerText = "Your browser doesn't fully support the Speech Synthesis API. Please try Chrome, Edge, or Safari for the best experience.";
    
    document.body.insertBefore(warning, document.body.firstChild);
  });
}

let speech = new SpeechSynthesisUtterance();
let voices = [];
let voicesByAccent = {};
let startTime = 0;
let totalDuration = 0;
let currentChar = 0;
let pauseStartTime = 0;
let totalPausedTime = 0;
let isPaused = false;
let animationId = null;
let isIntentionallyStopping = false;

const playBtn = document.getElementById('play');
const pauseBtn = document.getElementById('pause');
const stopBtn = document.getElementById('stop');
const replayBtn = document.getElementById('replay');
const voiceGender = document.getElementById('voiceGender');
const accent = document.getElementById('accent');
const speed = document.getElementById('speed');
const voiceStatus = document.createElement('div');
voiceStatus.className = 'voice-status';

let settingsContainer = document.querySelector('.settings');
if (!settingsContainer) {
  settingsContainer = document.createElement('div');
  settingsContainer.className = 'settings';
  settingsContainer.style.display = 'none';
  document.body.appendChild(settingsContainer);
}
settingsContainer.appendChild(voiceStatus);

const textContent = {
  'en': 'Welcome to our Text-to-Speech demo...',
  'ar-SA': 'مرحبًا بكم في عرض توضيحي لتقنية تحويل النص إلى كلام...',
  'ar-EG': 'أهلا بيكم في تجربة تحويل النص إلى كلام...'
};

function loadVoices() {
  try {
    voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) {
      setTimeout(loadVoices, 100);
      return;
    }

    voicesByAccent = {};
    for (const voice of voices) {
      const lang = voice.lang.substring(0, 2);
      const fullLang = voice.lang;

      if (!voicesByAccent[lang]) voicesByAccent[lang] = { male: [], female: [], unknown: [] };
      if (!voicesByAccent[fullLang]) voicesByAccent[fullLang] = { male: [], female: [], unknown: [] };

      const femalePatternsExact = ['female', 'woman', 'girl', 'zira', 'sara', 'laila', 'fatima', 'samantha', 'victoria', 'monica', 'fiona', 'karen', 'veena', 'moira', 'lisa'];
      const malePatternsExact = ['male', 'man', 'guy', 'david', 'mark', 'james', 'ahmed', 'ali', 'bruce', 'fred', 'george', 'alex', 'daniel', 'paul', 'thomas', 'arthur'];
      const lowerName = voice.name.toLowerCase();

      const isFemale = femalePatternsExact.some(pattern => lowerName.includes(pattern));
      const isMale = malePatternsExact.some(pattern => lowerName.includes(pattern));

      if (isFemale && !isMale) {
        voicesByAccent[lang].female.push(voice);
        voicesByAccent[fullLang].female.push(voice);
      } else if (isMale && !isFemale) {
        voicesByAccent[lang].male.push(voice);
        voicesByAccent[fullLang].male.push(voice);
      } else {
        voicesByAccent[lang].unknown.push(voice);
        voicesByAccent[fullLang].unknown.push(voice);
        voicesByAccent[lang].male.push(voice);
        voicesByAccent[fullLang].male.push(voice);
        voicesByAccent[lang].female.push(voice);
        voicesByAccent[fullLang].female.push(voice);
      }
    }

    updateVoiceAvailabilityStatus();
  } catch (error) {
    console.error("Error loading voices:", error);
  }
}
function updateVoiceAvailabilityStatus() {
    try {
      const selectedAccent = accent.value;
      const selectedGender = voiceGender.value;
      const baseCode = selectedAccent.substring(0, 2);
  
      const hasVoicesForAccent = voicesByAccent[selectedAccent] &&
        (voicesByAccent[selectedAccent].male.length > 0 ||
         voicesByAccent[selectedAccent].female.length > 0 ||
         voicesByAccent[selectedAccent].unknown.length > 0);
  
      const hasRequestedGender = voicesByAccent[selectedAccent] &&
        voicesByAccent[selectedAccent][selectedGender].length > 0;
  
      if (!hasVoicesForAccent) {
        voiceStatus.textContent = `No voices available for ${selectedAccent}. Using fallback voices.`;
        voiceStatus.className = 'voice-status warning';
      } else if (!hasRequestedGender) {
        const fallbackGender = selectedGender === 'male' ? 'female' : 'male';
        if (voicesByAccent[selectedAccent][fallbackGender].length > 0) {
          voiceStatus.textContent = `No ${selectedGender} voices for ${selectedAccent}. Using ${fallbackGender} voice instead.`;
          voiceStatus.className = 'voice-status info';
        } else {
          voiceStatus.textContent = `Limited voice support for ${selectedAccent}.`;
          voiceStatus.className = 'voice-status warning';
        }
      } else {
        voiceStatus.textContent = `${voicesByAccent[selectedAccent][selectedGender].length} ${selectedGender} voices available for ${selectedAccent}.`;
        voiceStatus.className = 'voice-status success';
      }
    } catch (error) {
      console.error("Error updating voice status:", error);
    }
  }
  
function setSpeech() {
  try {
    const gender = voiceGender.value;
    const selectedAccent = accent.value;
    
    console.log(`Setting speech with gender: ${gender}, accent: ${selectedAccent}`);
    
    const pageContent = document.querySelector('.site-content') || document.querySelector('.tts-content');

    if (!pageContent) {
      alert("No content found to read. Please make sure your content is properly marked up.");
      console.error("No content element found to read");
      return;
    }

    let contentToRead = pageContent;
    
    const articleContent = pageContent.querySelector('article .entry-content');
    const mainContent = pageContent.querySelector('main');
    const entryContent = pageContent.querySelector('.entry-content');
    
    if (articleContent) {
      contentToRead = articleContent;
    } else if (entryContent) {
      contentToRead = entryContent;
    } else if (mainContent) {
      contentToRead = mainContent;
    }

    const textToRead = contentToRead.textContent.trim();
    if (!textToRead) {
      alert("No text content found to read.");
      console.error("No text content found to read");
      return;
    }

    if (!window.speechSynthesis) {
      alert("Your browser doesn't support text-to-speech. Please try Chrome, Edge or Safari.");
      return;
    }

    if (!voices || voices.length === 0) {
      console.log("No voices available, trying to load them now");
      loadVoices();
      
      if (!voices || voices.length === 0) {
        alert("No text-to-speech voices found. Please try reloading the page or using a different browser.");
        return;
      }
    }

    let selectedVoice = null;
    let fallbackUsed = false;
    
    if (voicesByAccent[selectedAccent] && voicesByAccent[selectedAccent][gender]?.length > 0) {
      selectedVoice = voicesByAccent[selectedAccent][gender][0];
      console.log(`Found perfect match: ${selectedVoice.name} (${selectedVoice.lang})`);
    } else {
      fallbackUsed = true;
      const baseCode = selectedAccent.substring(0, 2);
      
      if (voicesByAccent[baseCode] && voicesByAccent[baseCode][gender]?.length > 0) {
        selectedVoice = voicesByAccent[baseCode][gender][0];
        console.log(`Using language fallback with correct gender: ${selectedVoice.name} (${selectedVoice.lang})`);
      } else if (voicesByAccent[selectedAccent]) {
        const oppositeGender = gender === 'male' ? 'female' : 'male';
        
        if (voicesByAccent[selectedAccent][oppositeGender]?.length > 0) {
          selectedVoice = voicesByAccent[selectedAccent][oppositeGender][0];
          console.log(`Using opposite gender (${oppositeGender}) with correct accent: ${selectedVoice.name} (${selectedVoice.lang})`);
        } else if (voicesByAccent[selectedAccent].unknown?.length > 0) {
          selectedVoice = voicesByAccent[selectedAccent].unknown[0];
          console.log(`Using "unknown" gender voice with correct accent: ${selectedVoice.name} (${selectedVoice.lang})`);
        }
      }
      if (!selectedVoice && voices.length > 0) {
        selectedVoice = voices[0];
        console.log(`Using default voice as last resort: ${selectedVoice.name} (${selectedVoice.lang})`);
      }
    }

    if (!selectedVoice) {
      alert("No voice available for speech. Please try a different language or accent.");
      console.error("No voice available for speech");
      return;
    }

    if (fallbackUsed && isMobile) {
      const feedbackEl = document.createElement('div');
      feedbackEl.style.position = 'fixed';
      feedbackEl.style.bottom = '100px';
      feedbackEl.style.left = '50%';
      feedbackEl.style.transform = 'translateX(-50%)';
      feedbackEl.style.backgroundColor = 'rgba(0,0,0,0.7)';
      feedbackEl.style.color = 'white';
      feedbackEl.style.padding = '8px 12px';
      feedbackEl.style.borderRadius = '4px';
      feedbackEl.style.zIndex = '9999';
      feedbackEl.textContent = `Using voice: ${selectedVoice.name}`;
      document.body.appendChild(feedbackEl);
      
      setTimeout(() => {
        feedbackEl.style.opacity = '0';
        feedbackEl.style.transition = 'opacity 0.5s ease';
        setTimeout(() => document.body.removeChild(feedbackEl), 500);
      }, 3000);
    }

    speech = new SpeechSynthesisUtterance();
    speech.voice = selectedVoice;
    speech.rate = parseFloat(speed.value);
    speech.lang = selectedVoice.lang;
    speech.text = textToRead;
    speech.volume = 1.0;

    window.currentContentElement = contentToRead;

    speech.onstart = () => {
      console.log("Speech started with voice:", selectedVoice.name);
      showActiveVoiceInfo();
    };

    speech.onboundary = (event) => {
      try {
        highlightText(event.charIndex, contentToRead);
      } catch (e) {
        console.error("Error highlighting text:", e);
      }
    };

    speech.onend = () => {
      console.log("Speech ended");
      clearHighlight(contentToRead);
      document.getElementById('currentTime').textContent = '0:00';
      document.getElementById('progressBar').style.width = '0%';
    };

    speech.onerror = (event) => {
      console.error("Speech error:", event);
      
      if (event.error !== "interrupted") {
        alert("Error occurred during speech: " + event.error);
      }
    };

    calculateReadingTime();
    debugAudio();
    
    return true;
  } catch (error) {
    console.error("Error setting up speech:", error);
    alert("There was a problem setting up the speech. Please try reloading the page.");
    return false;
  }
}
  
function highlightText(charIndex, element) {
  try {
    if (!element) return;
    
    clearHighlight(element);
    
    if (!element._originalContent) {
      element._originalContent = element.innerHTML;
    }
    
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      const textNodes = getTextNodesIn(element);
      let currentLength = 0;
      let targetNode = null;
      let nodeCharIndex = 0;
      
      for (let i = 0; i < textNodes.length; i++) {
        let nodeLength = textNodes[i].length;
        if (currentLength + nodeLength > charIndex) {
          targetNode = textNodes[i];
          nodeCharIndex = charIndex - currentLength;
          break;
        }
        currentLength += nodeLength;
      }
      
      if (targetNode && targetNode.parentNode) {
        const marker = document.createElement('span');
        marker.className = 'tts-highlight';
        marker.textContent = targetNode.textContent.substring(nodeCharIndex, nodeCharIndex + 10);
        
        const beforeText = document.createTextNode(targetNode.textContent.substring(0, nodeCharIndex));
        const afterText = document.createTextNode(targetNode.textContent.substring(nodeCharIndex + 10));
        
        const parentNode = targetNode.parentNode;
        parentNode.insertBefore(beforeText, targetNode);
        parentNode.insertBefore(marker, targetNode);
        parentNode.insertBefore(afterText, targetNode);
        parentNode.removeChild(targetNode);
        
        marker.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else {
      const text = element.textContent;
      const before = text.substring(0, charIndex);
      const highlight = text.substring(charIndex, charIndex + 10);
      const after = text.substring(charIndex + 10);
      
      element.innerHTML = before +
        '<span class="tts-highlight">' + highlight + '</span>' +
        after;
    }
  } catch (e) {
    console.error("Highlighting error:", e);
  }
}

function getTextNodesIn(node) {
  var textNodes = [];
  if (node.nodeType == 3) {
    textNodes.push(node);
  } else {
    var children = node.childNodes;
    for (var i = 0; i < children.length; ++i) {
      textNodes.push.apply(textNodes, getTextNodesIn(children[i]));
    }
  }
  return textNodes;
}

function clearHighlight(element) {
  if (!element) return;
  
  const highlights = element.querySelectorAll('.tts-highlight');
  highlights.forEach(highlight => {
    const text = document.createTextNode(highlight.textContent);
    highlight.parentNode.replaceChild(text, highlight);
  });
  
  if (element._originalContent && highlights.length === 0) {
    element.innerHTML = element._originalContent;
    delete element._originalContent;
  }
}

function calculateReadingTime() {
  try {
    const pageContent = document.querySelector('.site-content') || document.querySelector('.tts-content');
    if (!pageContent) {
      console.error("No content found for reading time calculation");
      return;
    }
    
    const articleContent = pageContent.querySelector('article .entry-content');
    const mainContent = pageContent.querySelector('main');
    const entryContent = pageContent.querySelector('.entry-content');
    
    let contentToRead = pageContent;
    if (articleContent) {
      contentToRead = articleContent;
    } else if (entryContent) {
      contentToRead = entryContent;
    } else if (mainContent) {
      contentToRead = mainContent;
    }

    const text = contentToRead.textContent;
    const wordCount = text.trim().split(/\s+/).length;
    const wordsPerMinute = parseFloat(speed.value) * 150;

    totalDuration = Math.ceil((wordCount / wordsPerMinute) * 60);

    const minutes = Math.floor(totalDuration / 60);
    const seconds = totalDuration % 60;

    const totalTimeElement = document.getElementById('totalTime');
    const currentTimeElement = document.getElementById('currentTime');
    const progressBarElement = document.getElementById('progressBar');
    
    if (totalTimeElement) totalTimeElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    if (currentTimeElement) currentTimeElement.textContent = '0:00';
    if (progressBarElement) progressBarElement.style.width = '0%';
    
    console.log(`Calculated reading time: ${minutes}:${seconds.toString().padStart(2, '0')}`);
  } catch (error) {
    console.error("Error calculating reading time:", error);
  }
}
  
function updateProgress() {
  try {
    if (!window.speechSynthesis.speaking || isPaused) return;
  
    const now = Date.now();
    const elapsed = (now - startTime) - totalPausedTime;
    const currentTime = Math.floor(elapsed / 1000);
    const progress = (currentTime / totalDuration) * 100;
  
    const minutes = Math.floor(currentTime / 60);
    const seconds = currentTime % 60;
  
    document.getElementById('currentTime').textContent =
      `${minutes}:${seconds.toString().padStart(2, '0')}`;
    document.getElementById('progressBar').style.width = `${Math.min(progress, 100)}%`;
  
    if (window.speechSynthesis.speaking && !isPaused) {
      animationId = requestAnimationFrame(updateProgress);
    }
  } catch (error) {
    console.error("Error updating progress:", error);
  }
}
  
accent.addEventListener('change', updateVoiceAvailabilityStatus);
voiceGender.addEventListener('change', updateVoiceAvailabilityStatus);
  
speed.addEventListener('change', () => {
  if (window.speechSynthesis.speaking) {
    isIntentionallyStopping = true;
    
    window.speechSynthesis.cancel();
    
    const currentPosition = currentChar;
    
    setSpeech();
    
    window.speechSynthesis.speak(speech);
    
    startTime = Date.now();
    totalPausedTime = 0;
    pauseStartTime = 0;
    
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
    requestAnimationFrame(updateProgress);
    
    setTimeout(() => {
      isIntentionallyStopping = false;
    }, 100);
  } else {
    calculateReadingTime();
  }
});
  
playBtn.addEventListener('click', () => {
  console.log("Play button clicked");

  if (window.speechSynthesis.paused && window.speechSynthesis.speaking) {
    console.log("Resuming paused speech");
    window.speechSynthesis.resume();
    
    if (isPaused && pauseStartTime > 0) {
      const pauseDuration = Date.now() - pauseStartTime;
      totalPausedTime += pauseDuration;
      pauseStartTime = 0;
    }
    
    isPaused = false;
    requestAnimationFrame(updateProgress);
  } else {
    console.log("Starting new speech");
    window.speechSynthesis.cancel();
    
    const success = setSpeech();
    if (success) {
      const tempUtterance = new SpeechSynthesisUtterance('');
      window.speechSynthesis.speak(tempUtterance);
      window.speechSynthesis.cancel();
      
      window.speechSynthesis.speak(speech);
      
      startTime = Date.now();
      totalPausedTime = 0;
      pauseStartTime = 0;
      isPaused = false;
      
      requestAnimationFrame(updateProgress);
      
      setTimeout(() => {
        if (!window.speechSynthesis.speaking) {
          alert("Speech failed to start. This may be due to browser restrictions. Try clicking elsewhere on the page first.");
          console.log("Speech not started after timeout. Browser may require user interaction first.");
        }
      }, 500);
    }
  }
});
  
pauseBtn.addEventListener('click', () => {
  console.log("Pause button clicked");
    
  if (!window.speechSynthesis.speaking) return;
    
  window.speechSynthesis.pause();
  isPaused = true;
  pauseStartTime = Date.now();
    
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
});
  
stopBtn.addEventListener('click', () => {
  console.log("Stop button clicked");
  
  try {
    isIntentionallyStopping = true;
    
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    
    isPaused = false;
    totalPausedTime = 0;
    pauseStartTime = 0;
    
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
    
    const currentTimeElement = document.getElementById('currentTime');
    const progressBarElement = document.getElementById('progressBar');
    
    if (currentTimeElement) currentTimeElement.textContent = '0:00';
    if (progressBarElement) progressBarElement.style.width = '0%';
    
    const pageContent = document.querySelector('.site-content') || document.querySelector('.tts-content');
    if (pageContent) {
      clearHighlight(pageContent);
    }
    
    console.log("Speech stopped successfully");
    
    setTimeout(() => {
      isIntentionallyStopping = false;
    }, 100);
  } catch (error) {
    console.error("Error stopping speech:", error);
    isIntentionallyStopping = false;
  }
});

replayBtn.addEventListener('click', () => {
  console.log("Replay button clicked");
  
  try {
    isIntentionallyStopping = true;
    
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    
    const pageContent = document.querySelector('.site-content') || document.querySelector('.tts-content');
    if (pageContent) {
      clearHighlight(pageContent);
    }
    
    isPaused = false;
    totalPausedTime = 0;
    pauseStartTime = 0;
    
    const success = setSpeech();
    if (success) {
      startTime = Date.now();
      
      setTimeout(() => {
        window.speechSynthesis.speak(speech);
        
        if (animationId) {
          cancelAnimationFrame(animationId);
          animationId = null;
        }
        
        requestAnimationFrame(updateProgress);
        console.log("Speech replay started successfully");
        
        isIntentionallyStopping = false;
      }, 50);
    } else {
      isIntentionallyStopping = false;
    }
  } catch (error) {
    console.error("Error replaying speech:", error);
    isIntentionallyStopping = false;
  }
});

function initVoices() {
  voices = window.speechSynthesis.getVoices();
  
  if (voices && voices.length > 0) {
    console.log(`${voices.length} voices loaded immediately`);
    loadVoices();
    if (isMobile) {
      setTimeout(addVoiceInspectorButton, 1000);
    }
  } else {
    let attempts = 0;
    const maxAttempts = 10;
    
    const tryLoadingVoices = () => {
      voices = window.speechSynthesis.getVoices();
      attempts++;
      
      if (voices && voices.length > 0) {
        console.log(`${voices.length} voices loaded after ${attempts} attempts`);
        loadVoices();
        calculateReadingTime();
        return;
      }
      
      if (attempts < maxAttempts) {
        console.log(`No voices available yet (attempt ${attempts}/${maxAttempts}), trying again...`);
        setTimeout(tryLoadingVoices, 500);
      } else {
        console.error("Failed to load voices after multiple attempts");
      }
    };
    
    setTimeout(tryLoadingVoices, 100);
  }
}
  
if (window.speechSynthesis.onvoiceschanged !== undefined) {
  window.speechSynthesis.onvoiceschanged = loadVoices;
}
  
initVoices();

document.addEventListener('DOMContentLoaded', function() {
  const speedValue = document.getElementById('speedValue');
  speed.value = 1.0;
  speedValue.textContent = "1.0x";
  
  document.getElementById('ttsToggle').addEventListener('click', () => {
    document.querySelector('.tts-widget').classList.add('active');
    document.getElementById('ttsToggle').classList.add('hidden');
    calculateReadingTime();
  });

  document.getElementById('ttsClose').addEventListener('click', () => {
    document.querySelector('.tts-widget').classList.remove('active');
    document.getElementById('ttsToggle').classList.remove('hidden');
  });

  const genderToggleBtn = document.getElementById('genderToggle');
  const maleIcon = genderToggleBtn.querySelector('.fa-male');
  const femaleIcon = genderToggleBtn.querySelector('.fa-female');
  
  maleIcon.classList.add('active');
  femaleIcon.classList.remove('active');
  voiceGender.value = 'male';

  genderToggleBtn.addEventListener('click', () => {
    if (maleIcon.classList.contains('active')) {
      maleIcon.classList.remove('active');
      femaleIcon.classList.add('active');
      voiceGender.value = 'female';
    } else {
      femaleIcon.classList.remove('active');
      maleIcon.classList.add('active');
      voiceGender.value = 'male';
    }
    
    updateVoiceAvailabilityStatus();
  });

  let currentSpeed = 1.0;

  document.getElementById('speedUp').addEventListener('click', () => {
    if (currentSpeed < 2.0) {
      currentSpeed = Math.min(2.0, currentSpeed + 0.1);
      currentSpeed = Math.round(currentSpeed * 10) / 10;
      speedValue.textContent = currentSpeed.toFixed(1) + 'x';
      speed.value = currentSpeed;
      
      if (window.speechSynthesis.speaking) {
        isIntentionallyStopping = true;
        
        window.speechSynthesis.cancel();
        setSpeech();
        window.speechSynthesis.speak(speech);
        startTime = Date.now();
        
        if (animationId) {
          cancelAnimationFrame(animationId);
        }
        requestAnimationFrame(updateProgress);
        
        setTimeout(() => {
          isIntentionallyStopping = false;
        }, 100);
      } else {
        calculateReadingTime();
      }
    }
  });

  document.getElementById('speedDown').addEventListener('click', () => {
    if (currentSpeed > 0.5) {
      currentSpeed = Math.max(0.5, currentSpeed - 0.1);
      currentSpeed = Math.round(currentSpeed * 10) / 10;
      speedValue.textContent = currentSpeed.toFixed(1) + 'x';
      speed.value = currentSpeed;
      
      if (window.speechSynthesis.speaking) {
        isIntentionallyStopping = true;
        
        window.speechSynthesis.cancel();
        setSpeech();
        window.speechSynthesis.speak(speech);
        startTime = Date.now();
        
        if (animationId) {
          cancelAnimationFrame(animationId);
        }
        requestAnimationFrame(updateProgress);
        
        setTimeout(() => {
          isIntentionallyStopping = false;
        }, 100);
      } else {
        calculateReadingTime();
      }
    }
  });

  calculateReadingTime();
});

function detectContentLanguage() {
  const contentElement = document.querySelector('.site-content');
  if (!contentElement) return 'en';
  
  const articleContent = contentElement.querySelector('article .entry-content');
  const mainContent = contentElement.querySelector('main');
  const entryContent = contentElement.querySelector('.entry-content');
  
  let targetElement = contentElement;
  if (articleContent) {
    targetElement = articleContent;
  } else if (entryContent) {
    targetElement = entryContent;
  } else if (mainContent) {
    targetElement = mainContent;
  }
  
  const text = targetElement.textContent.trim();
  if (!text) return 'en';
  
  const arabicPattern = /[\u0600-\u06FF\u0750-\u077F]/;
  return arabicPattern.test(text) ? 'ar' : 'en';
}

function updateLanguageBasedOnContent() {
  const detectedLanguage = detectContentLanguage();
  console.log(`Detected content language: ${detectedLanguage}`);
  
  updateLanguageOptions(detectedLanguage);
  
  const contentElement = document.querySelector('.tts-content');
  if (contentElement) {
    contentElement.dir = detectedLanguage === 'ar' ? 'rtl' : 'ltr';
  }
  
  return detectedLanguage;
}

document.addEventListener('DOMContentLoaded', function() {
  const detectedLanguage = updateLanguageBasedOnContent();
  
  const languageIndicator = document.createElement('div');
  languageIndicator.className = 'language-indicator';
  
  const languageIcon = document.createElement('span');
  languageIcon.className = 'lang-icon';
  languageIcon.innerHTML = detectedLanguage === 'ar' ? '🇦🇪' : '🇺🇸';
  
  const languageText = document.createElement('span');
  languageText.className = 'lang-text';
  languageText.textContent = detectedLanguage === 'ar' ? 'Arabic' : 'English';
  
  languageIndicator.appendChild(languageIcon);
  languageIndicator.appendChild(languageText);
  
  const optionsSection = document.querySelector('.tts-widget-section.options');
  if (optionsSection) {
    const accentElement = document.getElementById('accent');
    if (accentElement && accentElement.parentNode) {
      optionsSection.insertBefore(languageIndicator, accentElement.parentNode);
    }
  }
  
  updateLanguageOptions(detectedLanguage);
});

function updateLanguageOptions(selectedLanguage) {
  const accentDropdown = document.getElementById('accent');
  if (!accentDropdown) return;
  
  while (accentDropdown.options.length > 0) {
    accentDropdown.remove(0);
  }
  
  if (selectedLanguage === 'ar') {
    // Arabic options only
    const arOptions = [
      { value: 'ar-SA', label: '🇸🇦 Saudi' },
      { value: 'ar-EG', label: '🇪🇬 Egyptian' },
    ];
    
    arOptions.forEach(option => {
      const opt = document.createElement('option');
      opt.value = option.value;
      opt.textContent = option.label;
      accentDropdown.appendChild(opt);
    });
    
    accentDropdown.value = 'ar-SA';
  } else {
    // English options only
    const enOptions = [
      { value: 'en-US', label: '🇺🇸 American' },
      { value: 'en-GB', label: '🇬🇧 British' },
    ];
    
    enOptions.forEach(option => {
      const opt = document.createElement('option');
      opt.value = option.value;
      opt.textContent = option.label;
      accentDropdown.appendChild(opt);
    });
    
    accentDropdown.value = 'en-US';
  }
  
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  if (isMobile) {
    accentDropdown.style.fontSize = '22px';
    accentDropdown.style.padding = '8px 12px';
    
    accentDropdown.addEventListener('change', function() {
      console.log("Accent changed to:", this.value);
      
      updateVoiceAvailabilityStatus();
      
      const selectedOption = this.options[this.selectedIndex];
      const feedbackEl = document.createElement('div');
      feedbackEl.style.position = 'fixed';
      feedbackEl.style.bottom = '70px';
      feedbackEl.style.left = '50%';
      feedbackEl.style.transform = 'translateX(-50%)';
      feedbackEl.style.backgroundColor = 'rgba(0,0,0,0.7)';
      feedbackEl.style.color = 'white';
      feedbackEl.style.padding = '8px 12px';
      feedbackEl.style.borderRadius = '4px';
      feedbackEl.style.zIndex = '9999';
      feedbackEl.textContent = `Accent: ${selectedOption.title}`;
      document.body.appendChild(feedbackEl);
      
      setTimeout(() => {
        feedbackEl.style.opacity = '0';
        feedbackEl.style.transition = 'opacity 0.5s ease';
        setTimeout(() => document.body.removeChild(feedbackEl), 500);
      }, 1500);
    });
  }
  
  const event = new Event('change');
  accentDropdown.dispatchEvent(event);
  
  updateTextContentByLanguage(selectedLanguage);
}

function updateTextContentByLanguage(language) {
  const contentElement = document.querySelector('.site-content');
  if (!contentElement) return;
  
  if (language === 'ar') {
    contentElement.dir = 'rtl';
  } else {
    contentElement.dir = 'ltr';
  }
}

document.addEventListener('DOMContentLoaded', function() {
  setTimeout(() => {
    calculateReadingTime();
    console.log("Initial reading time calculation completed");
  }, 500);
});

document.addEventListener('DOMContentLoaded', function() {
  const genderToggleBtn = document.getElementById('genderToggle');
  if (!genderToggleBtn) return;
  
  const maleIcon = genderToggleBtn.querySelector('.fa-male');
  const femaleIcon = genderToggleBtn.querySelector('.fa-female');
  
  maleIcon.classList.add('active');
  femaleIcon.classList.remove('active');
  voiceGender.value = 'male';

  const toggleGender = () => {
    console.log("Gender toggle clicked");
    if (maleIcon.classList.contains('active')) {
      maleIcon.classList.remove('active');
      femaleIcon.classList.add('active');
      voiceGender.value = 'female';
    } else {
      femaleIcon.classList.remove('active');
      maleIcon.classList.add('active');
      voiceGender.value = 'male';
    }
    
    updateVoiceAvailabilityStatus();
    
    const feedbackEl = document.createElement('div');
    feedbackEl.style.position = 'fixed';
    feedbackEl.style.bottom = '70px';
    feedbackEl.style.left = '50%';
    feedbackEl.style.transform = 'translateX(-50%)';
    feedbackEl.style.backgroundColor = 'rgba(0,0,0,0.7)';
    feedbackEl.style.color = 'white';
    feedbackEl.style.padding = '8px 12px';
    feedbackEl.style.borderRadius = '4px';
    feedbackEl.style.zIndex = '9999';
    feedbackEl.textContent = `Voice: ${voiceGender.value}`;
    document.body.appendChild(feedbackEl);
    
    setTimeout(() => {
      feedbackEl.style.opacity = '0';
      feedbackEl.style.transition = 'opacity 0.5s ease';
      setTimeout(() => document.body.removeChild(feedbackEl), 500);
    }, 1500);
  };
  
  genderToggleBtn.addEventListener('click', toggleGender);
  genderToggleBtn.addEventListener('touchend', (e) => {
    e.preventDefault();
    toggleGender();
  });
});

function addVoiceInspectorButton() {
  const debugBtn = document.createElement('button');
  debugBtn.style.position = 'fixed';
  debugBtn.style.bottom = '140px';
  debugBtn.style.right = '20px';
  debugBtn.style.zIndex = '9999';
  debugBtn.style.padding = '8px';
  debugBtn.style.borderRadius = '5px';
  debugBtn.style.backgroundColor = '#5d49c8';
  debugBtn.style.color = 'white';
  debugBtn.style.border = 'none';
  debugBtn.style.fontSize = '14px';
  debugBtn.textContent = '🔍 Voice Inspector';
  
  debugBtn.addEventListener('click', showVoiceDetails);
  document.body.appendChild(debugBtn);
}

function showVoiceDetails() {
  const modal = document.createElement('div');
  modal.style.position = 'fixed';
  modal.style.top = '50%';
  modal.style.left = '50%';
  modal.style.transform = 'translate(-50%, -50%)';
  modal.style.backgroundColor = 'white';
  modal.style.padding = '20px';
  modal.style.borderRadius = '8px';
  modal.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
  modal.style.zIndex = '10000';
  modal.style.maxWidth = '90%';
  modal.style.maxHeight = '80%';
  modal.style.overflow = 'auto';
  
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕';
  closeBtn.style.position = 'absolute';
  closeBtn.style.right = '10px';
  closeBtn.style.top = '10px';
  closeBtn.style.border = 'none';
  closeBtn.style.background = 'none';
  closeBtn.style.fontSize = '20px';
  closeBtn.style.cursor = 'pointer';
  closeBtn.addEventListener('click', () => document.body.removeChild(modal));
  modal.appendChild(closeBtn);
  
  const title = document.createElement('h2');
  title.textContent = 'Voice Inspector';
  title.style.marginTop = '0';
  modal.appendChild(title);

  const selectedVoiceInfo = document.createElement('div');
  selectedVoiceInfo.style.marginBottom = '20px';
  selectedVoiceInfo.style.padding = '10px';
  selectedVoiceInfo.style.backgroundColor = '#f0f0f0';
  selectedVoiceInfo.style.borderRadius = '5px';
  
  const selectedGender = voiceGender.value;
  const selectedAccent = accent.value;
  
  const baseCode = selectedAccent.substring(0, 2);
  let voiceToUse = null;
  
  if (voicesByAccent[selectedAccent] && voicesByAccent[selectedAccent][selectedGender].length > 0) {
    voiceToUse = voicesByAccent[selectedAccent][selectedGender][0];
  } else if (voicesByAccent[selectedAccent]) {
    const fallbackGender = selectedGender === 'male' ? 'female' : 'male';
    if (voicesByAccent[selectedAccent][fallbackGender].length > 0) {
      voiceToUse = voicesByAccent[selectedAccent][fallbackGender][0];
    } else if (voicesByAccent[selectedAccent].unknown.length > 0) {
      voiceToUse = voicesByAccent[selectedAccent].unknown[0];
    }
  } else if (voicesByAccent[baseCode]) {
    if (voicesByAccent[baseCode][selectedGender].length > 0) {
      voiceToUse = voicesByAccent[baseCode][selectedGender][0];
    } else if (voicesByAccent[baseCode][selectedGender === 'male' ? 'female' : 'male'].length > 0) {
      voiceToUse = voicesByAccent[baseCode][selectedGender === 'male' ? 'female' : 'male'][0];
    }
  }
  
  if (voiceToUse) {
    selectedVoiceInfo.innerHTML = `<strong>Currently Selected Voice:</strong><br>
      Name: ${voiceToUse.name}<br>
      Language: ${voiceToUse.lang}<br>
      Default: ${voiceToUse.default ? 'Yes' : 'No'}<br>
      <strong>UI Settings:</strong><br>
      Gender: ${selectedGender}<br>
      Accent: ${selectedAccent}<br>
      <strong>Gender Match:</strong> ${voiceToUse.name.toLowerCase().includes(selectedGender) ? '✓ Matches' : '✗ Mismatch'}`;
      
    const testBtn = document.createElement('button');
    testBtn.textContent = 'Test This Voice';
    testBtn.style.marginTop = '10px';
    testBtn.style.padding = '5px 10px';
    testBtn.style.backgroundColor = '#9370DB';
    testBtn.style.color = 'white';
    testBtn.style.border = 'none';
    testBtn.style.borderRadius = '4px';
    testBtn.style.cursor = 'pointer';
    
    testBtn.addEventListener('click', () => {
      const testUtterance = new SpeechSynthesisUtterance('This is a test of the selected voice.');
      testUtterance.voice = voiceToUse;
      speechSynthesis.speak(testUtterance);
    });
    
    selectedVoiceInfo.appendChild(document.createElement('br'));
    selectedVoiceInfo.appendChild(testBtn);
  } else {
    selectedVoiceInfo.innerHTML = '<strong>No matching voice found for current settings.</strong>';
  }
  
  modal.appendChild(selectedVoiceInfo);
  
  const voicesList = document.createElement('div');
  voicesList.innerHTML = '<h3>All Available Voices (' + voices.length + ')</h3>';
  
  if (voices && voices.length > 0) {
    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    
    const thead = document.createElement('thead');
    thead.innerHTML = `<tr>
      <th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;">Name</th>
      <th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;">Language</th>
      <th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;">Default</th>
      <th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;">Gender Guess</th>
      <th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;">Test</th>
    </tr>`;
    table.appendChild(thead);
    
    const tbody = document.createElement('tbody');
    voices.forEach((voice, index) => {
      const row = document.createElement('tr');
      row.style.backgroundColor = index % 2 === 0 ? '#f9f9f9' : 'white';
      
      let genderGuess = 'unknown';
      const lowerName = voice.name.toLowerCase();
      if (lowerName.includes('female') || lowerName.includes('woman') || 
          lowerName.includes('girl') || lowerName.includes('fiona') || 
          lowerName.includes('samantha') || lowerName.includes('victoria') ||
          lowerName.includes('karen') || lowerName.includes('zira')) {
        genderGuess = 'female';
      } else if (lowerName.includes('male') || lowerName.includes('man') || 
                lowerName.includes('guy') || lowerName.includes('david') ||
                lowerName.includes('james') || lowerName.includes('thomas')) {
        genderGuess = 'male';
      }
      
      const testVoiceBtn = document.createElement('button');
      testVoiceBtn.textContent = 'Test';
      testVoiceBtn.style.padding = '2px 6px';
      testVoiceBtn.style.backgroundColor = '#9370DB';
      testVoiceBtn.style.color = 'white';
      testVoiceBtn.style.border = 'none';
      testVoiceBtn.style.borderRadius = '3px';
      testVoiceBtn.style.cursor = 'pointer';
      
      testVoiceBtn.addEventListener('click', () => {
        const testUtterance = new SpeechSynthesisUtterance('Testing voice ' + voice.name);
        testUtterance.voice = voice;
        speechSynthesis.speak(testUtterance);
      });
      
      row.innerHTML = `
        <td style="padding:8px;border-bottom:1px solid #ddd;">${voice.name}</td>
        <td style="padding:8px;border-bottom:1px solid #ddd;">${voice.lang}</td>
        <td style="padding:8px;border-bottom:1px solid #ddd;">${voice.default ? 'Yes' : 'No'}</td>
        <td style="padding:8px;border-bottom:1px solid #ddd;">${genderGuess}</td>
      `;
      
      const actionCell = document.createElement('td');
      actionCell.style.padding = '8px';
      actionCell.style.borderBottom = '1px solid #ddd';
      actionCell.appendChild(testVoiceBtn);
      row.appendChild(actionCell);
      
      tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    voicesList.appendChild(table);
  } else {
    voicesList.innerHTML += '<p>No voices available.</p>';
  }
  
  modal.appendChild(voicesList);
  document.body.appendChild(modal);
}

function showActiveVoiceInfo() {
  if (!isMobile) return;
  
  const infoBox = document.createElement('div');
  infoBox.style.position = 'fixed';
  infoBox.style.bottom = '120px';
  infoBox.style.right = '20px';
  infoBox.style.backgroundColor = 'rgba(0,0,0,0.7)';
  infoBox.style.color = 'white';
  infoBox.style.padding = '10px';
  infoBox.style.borderRadius = '5px';
  infoBox.style.zIndex = '9999';
  infoBox.style.fontSize = '12px';
  infoBox.style.maxWidth = '200px';
  infoBox.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
  
  if (speech && speech.voice) {
    infoBox.innerHTML = `
      <strong>Active Voice:</strong><br>
      ${speech.voice.name}<br>
      Lang: ${speech.voice.lang}<br>
      Rate: ${speech.rate}x
    `;
  } else {
    infoBox.textContent = 'No active voice';
  }
  
  document.body.appendChild(infoBox);
  
  setTimeout(() => {
    infoBox.style.opacity = '0';
    infoBox.style.transition = 'opacity 0.5s ease';
    setTimeout(() => document.body.removeChild(infoBox), 500);
  }, 5000);
}
