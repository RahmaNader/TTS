// Add this debugging function at the top of your script.js file
function debugAudio() {
    console.log("Audio debugging:");
    console.log("- SpeechSynthesis available:", 'speechSynthesis' in window);
    console.log("- Voices loaded:", voices.length);
    console.log("- Is speaking:", window.speechSynthesis.speaking);
    console.log("- Is paused:", window.speechSynthesis.paused);
    console.log("- Current content element:", document.querySelector('.site-content') || document.querySelector('.tts-content'));
  }
  
  // Add this check at the beginning of your script
  if (!window.speechSynthesis) {
    console.error("Speech Synthesis API is not available in this browser");
    // Create a warning element
    document.addEventListener('DOMContentLoaded', function() {
      const warning = document.createElement('div');
      warning.style.padding = "10px";
      warning.style.margin = "10px 0";
      warning.style.backgroundColor = "#fff3cd";
      warning.style.color = "#856404";
      warning.style.borderLeft = "5px solid #ffeeba";
      warning.style.borderRadius = "3px";
      warning.innerText = "Your browser doesn't fully support the Speech Synthesis API. Please try Chrome, Edge, or Safari for the best experience.";
      
      // Insert the warning at the top of the page
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
  let totalPausedTime = 0;  // Track total time spent paused
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
  
  // Create settings container if it doesn't exist
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
    
    // Updated content selection logic for TTS
    // Replace all content selections with WordPress selector
  function setSpeech() {
    try {
      const gender = voiceGender.value;
      const selectedAccent = accent.value;
      
      // Try WordPress content first, then fall back to demo content
      const pageContent = document.querySelector('.site-content') || document.querySelector('.tts-content');
  
      if (!pageContent) {
        alert("No content found to read. Please make sure your content is properly marked up.");
        console.error("No content element found to read");
        return;
      }
  
      // Get only the main content, excluding navigation, sidebar, etc.
      let contentToRead = pageContent;
      
      // Try to find more specific content containers
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
  
      // Check if speech synthesis is available
      if (!window.speechSynthesis) {
        alert("Your browser doesn't support text-to-speech. Please try Chrome, Edge or Safari.");
        return;
      }
  
      // Make sure we have voices
      if (!voices || voices.length === 0) {
        console.log("No voices available, trying to load them now");
        loadVoices();
        
        if (!voices || voices.length === 0) {
          alert("No text-to-speech voices found. Please try reloading the page or using a different browser.");
          return;
        }
      }
  
      let selectedVoice = null;
  
      if (voicesByAccent[selectedAccent] && voicesByAccent[selectedAccent][gender]?.length > 0) {
        selectedVoice = voicesByAccent[selectedAccent][gender][0];
      } else if (voicesByAccent[selectedAccent]?.unknown?.length > 0) {
        selectedVoice = voicesByAccent[selectedAccent].unknown[0];
      } else if (voices.length > 0) {
        selectedVoice = voices[0];
      }
  
      if (!selectedVoice) {
        alert("No voice available for speech. Please try a different language or accent.");
        console.error("No voice available for speech");
        return;
      }
  
      speech = new SpeechSynthesisUtterance();
      speech.voice = selectedVoice;
      speech.rate = parseFloat(speed.value);
      speech.lang = selectedAccent;
      speech.text = textToRead;
      speech.volume = 1.0; // Ensure volume is at maximum
  
      // Store reference to current content element for highlighting
      window.currentContentElement = contentToRead;
  
      speech.onstart = () => {
        console.log("Speech started with voice:", selectedVoice.name);
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
        
        // Ignore all 'interrupted' errors since they're usually intentional actions
        if (event.error !== "interrupted") {
          alert("Error occurred during speech: " + event.error);
        }
      };
  
      calculateReadingTime();
      debugAudio(); // Log diagnostic info
      
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
        const text = element.textContent;
        const before = text.substring(0, charIndex);
        const highlight = text.substring(charIndex, charIndex + 10);
        const after = text.substring(charIndex + 10);
    
        element.innerHTML = before +
          '<span class="tts-highlight">' + highlight + '</span>' +
          after;
      } catch (e) {
        console.error("Highlighting error:", e);
      }
    }
    
    function clearHighlight(element) {
      if (element) {
        element.innerHTML = element.textContent;
      }
    }
    // Replace the calculateReadingTime function with this version:
  function calculateReadingTime() {
    try {
      // Support both WordPress and demo content
      const pageContent = document.querySelector('.site-content') || document.querySelector('.tts-content');
      if (!pageContent) {
        console.error("No content found for reading time calculation");
        return;
      }
      
      // Try to find more specific content containers
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
  
      // Make sure these elements exist
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
    
    // Update voice status when controls change
    accent.addEventListener('change', updateVoiceAvailabilityStatus);
    voiceGender.addEventListener('change', updateVoiceAvailabilityStatus);
    
    speed.addEventListener('change', () => {
      if (window.speechSynthesis.speaking) {
        // Set flag before canceling speech to prevent error alerts
        isIntentionallyStopping = true;
        
        // Cancel current speech
        window.speechSynthesis.cancel();
        
        // Store character position for later
        const currentPosition = currentChar;
        
        // Set up new speech with updated speed
        setSpeech();
        
        // Start speaking with new speed settings
        window.speechSynthesis.speak(speech);
        
        // Reset timing variables
        startTime = Date.now();
        totalPausedTime = 0;
        pauseStartTime = 0;
        
        // Reset animation frame
        if (animationId) {
          cancelAnimationFrame(animationId);
        }
        requestAnimationFrame(updateProgress);
        
        // Reset the flag after a short delay
        setTimeout(() => {
          isIntentionallyStopping = false;
        }, 100);
      } else {
        calculateReadingTime();
      }
    });
    
    // Play button
  playBtn.addEventListener('click', () => {
    console.log("Play button clicked");
  
    if (window.speechSynthesis.paused && window.speechSynthesis.speaking) {
      console.log("Resuming paused speech");
      window.speechSynthesis.resume();
      
      // Calculate pause duration and add to total paused time
      if (isPaused && pauseStartTime > 0) {
        const pauseDuration = Date.now() - pauseStartTime;
        totalPausedTime += pauseDuration;
        pauseStartTime = 0;
      }
      
      isPaused = false;
      requestAnimationFrame(updateProgress);
    } else {
      console.log("Starting new speech");
      window.speechSynthesis.cancel(); // Cancel any ongoing speech
      
      const success = setSpeech();
      if (success) {
        // Try to force audio interaction
        const tempUtterance = new SpeechSynthesisUtterance('');
        window.speechSynthesis.speak(tempUtterance);
        window.speechSynthesis.cancel();
        
        // Now play the real speech
        window.speechSynthesis.speak(speech);
        
        // Reset all timing variables
        startTime = Date.now();
        totalPausedTime = 0;
        pauseStartTime = 0;
        isPaused = false;
        
        requestAnimationFrame(updateProgress);
        
        // Double-check if speech started
        setTimeout(() => {
          if (!window.speechSynthesis.speaking) {
            alert("Speech failed to start. This may be due to browser restrictions. Try clicking elsewhere on the page first.");
            console.log("Speech not started after timeout. Browser may require user interaction first.");
          }
        }, 500);
      }
    }
  });
    
    // Pause button
    pauseBtn.addEventListener('click', () => {
      console.log("Pause button clicked");
      
      if (!window.speechSynthesis.speaking) return;
      
      window.speechSynthesis.pause();
      isPaused = true;
      pauseStartTime = Date.now(); // Store when we paused
      
      if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
    });
    
    // Replace the Stop button handler
  stopBtn.addEventListener('click', () => {
    console.log("Stop button clicked");
    
    try {
      // Set flag before canceling speech
      isIntentionallyStopping = true;
      
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      
      // Reset all timing variables
      isPaused = false;
      totalPausedTime = 0;
      pauseStartTime = 0;
      
      if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
      
      // Safely update UI elements
      const currentTimeElement = document.getElementById('currentTime');
      const progressBarElement = document.getElementById('progressBar');
      
      if (currentTimeElement) currentTimeElement.textContent = '0:00';
      if (progressBarElement) progressBarElement.style.width = '0%';
      
      // Find content element - first try WordPress then demo content
      const pageContent = document.querySelector('.site-content') || document.querySelector('.tts-content');
      if (pageContent) {
        clearHighlight(pageContent);
      }
      
      console.log("Speech stopped successfully");
      
      // Reset flag after a short delay to allow the error event to fire first
      setTimeout(() => {
        isIntentionallyStopping = false;
      }, 100);
    } catch (error) {
      console.error("Error stopping speech:", error);
      isIntentionallyStopping = false;  // Reset flag in case of error
    }
  });
  
  // Fix the Replay button handler
  replayBtn.addEventListener('click', () => {
    console.log("Replay button clicked");
    
    try {
      // Set flag before canceling speech (just like in stop button)
      isIntentionallyStopping = true;
      
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      
      // Find content element
      const pageContent = document.querySelector('.site-content') || document.querySelector('.tts-content');
      if (pageContent) {
        clearHighlight(pageContent);
      }
      
      // Reset timing variables
      isPaused = false;
      totalPausedTime = 0;
      pauseStartTime = 0;
      
      // Call setSpeech with proper error handling
      const success = setSpeech();
      if (success) {
        startTime = Date.now();
        
        // Add a short delay to ensure proper initialization
        setTimeout(() => {
          window.speechSynthesis.speak(speech);
          
          // Ensure any previous animation frame is canceled
          if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
          }
          
          requestAnimationFrame(updateProgress);
          console.log("Speech replay started successfully");
          
          // Reset flag after speech has started
          isIntentionallyStopping = false;
        }, 50);
      } else {
        // Reset flag if speech setup failed
        isIntentionallyStopping = false;
      }
    } catch (error) {
      console.error("Error replaying speech:", error);
      isIntentionallyStopping = false;  // Reset flag in case of error
    }
  });
  
  // Initial setup: attempt to load voices with retry logic
  function initVoices() {
    // Load voices immediately if they're available
    voices = window.speechSynthesis.getVoices();
    
    if (voices && voices.length > 0) {
      console.log(`${voices.length} voices loaded immediately`);
      loadVoices();
    } else {
      // Set up a polling mechanism to keep trying
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
    
    // Bind the browser-specific event to handle when voices become available
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    
    // Kick off the voice loading on page load
    initVoices();
  
  // Add this code to the end of your script.js file
  
  // Set up event listeners for the new widget design
  document.addEventListener('DOMContentLoaded', function() {
    // Synchronize speed value display with actual speed input
    const speedValue = document.getElementById('speedValue');
    speed.value = 1.0;
    speedValue.textContent = "1.0x";
    
    // Toggle button for widget
    document.getElementById('ttsToggle').addEventListener('click', () => {
      document.querySelector('.tts-widget').classList.add('active');
      document.getElementById('ttsToggle').classList.add('hidden');
      // Calculate reading time when widget is opened
      calculateReadingTime();
    });
  
    document.getElementById('ttsClose').addEventListener('click', () => {
      document.querySelector('.tts-widget').classList.remove('active');
      document.getElementById('ttsToggle').classList.remove('hidden');
    });
  
    // Gender toggle button
    const genderToggleBtn = document.getElementById('genderToggle');
    const maleIcon = genderToggleBtn.querySelector('.fa-male');
    const femaleIcon = genderToggleBtn.querySelector('.fa-female');
    
    // Make sure male is active initially
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
      
      // Update voice selection
      updateVoiceAvailabilityStatus();
    });
  
    // Speed buttons
    let currentSpeed = 1.0;
  
    document.getElementById('speedUp').addEventListener('click', () => {
      if (currentSpeed < 2.0) {
        currentSpeed = Math.min(2.0, currentSpeed + 0.1);
        currentSpeed = Math.round(currentSpeed * 10) / 10; // Round to 1 decimal place
        speedValue.textContent = currentSpeed.toFixed(1) + 'x';
        speed.value = currentSpeed;
        
        // Set flag before making speed changes during active speech
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
          
          // Reset the flag after a short delay
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
        currentSpeed = Math.round(currentSpeed * 10) / 10; // Round to 1 decimal place
        speedValue.textContent = currentSpeed.toFixed(1) + 'x';
        speed.value = currentSpeed;
        
        // Set flag before making speed changes during active speech
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
          
          // Reset the flag after a short delay
          setTimeout(() => {
            isIntentionallyStopping = false;
          }, 100);
        } else {
          calculateReadingTime();
        }
      }
    });
  
    // Calculate reading time on page load
    calculateReadingTime();
  });
  
  // Replace the language switcher implementation with this content-based approach
  
  // Function to detect language from content
  function detectContentLanguage() {
    // Try to find content in the WordPress structure
    const contentElement = document.querySelector('.site-content');
    if (!contentElement) return 'en'; // Default to English if no content
    
    // Try to find the more specific content container
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
    
    // Simple heuristic: If the text contains Arabic characters, consider it Arabic
    const arabicPattern = /[\u0600-\u06FF\u0750-\u077F]/;
    return arabicPattern.test(text) ? 'ar' : 'en';
  }
  
  // Update the language options based on content
  function updateLanguageBasedOnContent() {
    const detectedLanguage = detectContentLanguage();
    console.log(`Detected content language: ${detectedLanguage}`);
    
    // Update language options to match content
    updateLanguageOptions(detectedLanguage);
    
    // If it's Arabic, make sure the text direction is set correctly
    const contentElement = document.querySelector('.tts-content');
    if (contentElement) {
      contentElement.dir = detectedLanguage === 'ar' ? 'rtl' : 'ltr';
    }
    
    return detectedLanguage;
  }
  
  // Modify the DOMContentLoaded event handler for language detection
  document.addEventListener('DOMContentLoaded', function() {
    // Your existing code...
    
    // Remove the language switcher code and replace with auto-detection
    const detectedLanguage = updateLanguageBasedOnContent();
    
    // Display a language indicator instead of switcher
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
    
    // Insert the indicator where the switcher would have been
    const optionsSection = document.querySelector('.tts-widget-section.options');
    if (optionsSection) {
      // Insert before accent dropdown
      const accentElement = document.getElementById('accent');
      if (accentElement && accentElement.parentNode) {
        optionsSection.insertBefore(languageIndicator, accentElement.parentNode);
      }
    }
    
    // Initialize with appropriate voices based on detected language
    updateLanguageOptions(detectedLanguage);
  });
  
  // Update the language options function to match content and reduce options
  function updateLanguageOptions(selectedLanguage) {
    const accentDropdown = document.getElementById('accent');
    if (!accentDropdown) return;
    
    // Clear existing options
    while (accentDropdown.options.length > 0) {
      accentDropdown.remove(0);
    }
    
    // Add appropriate options based on detected language
    if (selectedLanguage === 'ar') {
      // Arabic options only - flag icons only
      const arOptions = [
        { value: 'ar-SA', label: '🇸🇦' },
        { value: 'ar-EG', label: '🇪🇬' },
      ];
      
      arOptions.forEach(option => {
        const opt = document.createElement('option');
        opt.value = option.value;
        opt.textContent = option.label;
        opt.title = option.value === 'ar-SA' ? 'Saudi Arabic' : 'Egyptian Arabic';
        accentDropdown.appendChild(opt);
      });
      
      // Default to Saudi Arabic
      accentDropdown.value = 'ar-SA';
    } else {
      // English options only - flag icons only
      const enOptions = [
        { value: 'en-US', label: '🇺🇸' },
        { value: 'en-GB', label: '🇬🇧' },
      ];
      
      enOptions.forEach(option => {
        const opt = document.createElement('option');
        opt.value = option.value;
        opt.textContent = option.label;
        opt.title = option.value === 'en-US' ? 'American English' : 'British English';
        accentDropdown.appendChild(opt);
      });
      
      // Default to US English
      accentDropdown.value = 'en-US';
    }
    
    // Trigger change event to update voice selection
    const event = new Event('change');
    accentDropdown.dispatchEvent(event);
    
    // Update text content based on selected language
    updateTextContentByLanguage(selectedLanguage);
  }
  
  // Adjust this function to work with WordPress content
  function updateTextContentByLanguage(language) {
    // For WordPress we want to read existing content, not replace it
    // So we'll just ensure proper direction setting
    
    const contentElement = document.querySelector('.site-content');
    if (!contentElement) return;
    
    // Only update text direction if needed
    if (language === 'ar') {
      contentElement.dir = 'rtl';
    } else {
      contentElement.dir = 'ltr';
    }
  }
  
  // Add this to the end of the document.ready function to ensure the time displays on load:
  document.addEventListener('DOMContentLoaded', function() {
    // Add this after your existing code
    setTimeout(() => {
      // Ensure reading time is calculated after everything is loaded
      calculateReadingTime();
      console.log("Initial reading time calculation completed");
    }, 500);
  });

// Add this at the bottom of your script.js file

// Initialize widget when added via AJAX (for widgets or dynamic content)
jQuery(document).on('widget-added widget-updated', function() {
  initVoices();
  
  // Re-attach event listeners for dynamically loaded widgets
  jQuery('.tts-toggle-btn').on('click', function() {
    jQuery(this).closest('.widget').find('.tts-widget').addClass('active');
    jQuery(this).addClass('hidden');
    calculateReadingTime();
  });

  jQuery('.tts-close-btn').on('click', function() {
    jQuery(this).closest('.tts-widget').removeClass('active');
    jQuery(this).closest('.widget').find('.tts-toggle-btn').removeClass('hidden');
  });
});

// Initialize for Gutenberg blocks and dynamically loaded content
jQuery(document).on('DOMContentLoaded', function() {
  // Wait a bit to make sure WordPress has fully loaded
  setTimeout(function() {
    // Trigger recalculation for any widgets already in the page
    calculateReadingTime();
  }, 1000);
});
