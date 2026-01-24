
(() => {
   
console.log("youtube-live.js caricato");
const API_KEY = "AIzaSyCwtehnjxk-Z291xGHipUXbqoUyHYihqzk";
const CHANNEL_ID = "UCai4jGthClf8IfXxA3qnzPw";
const PLAYLIST_ID = "PLfSsFRyiyUaj_NMZimn7ka2Ln4mQwS4M2";
    const CHECK_INTERVAL = 30000; // 30s
  
    let showingLive = false;
    let lastLiveId = null;
    let intervalId = null;
  
    function setPlaylist(iframe) {
      if (!showingLive) return;
      iframe.src = `https://www.youtube.com/embed/videoseries?list=${PLAYLIST_ID}`;
      showingLive = false;
      lastLiveId = null;
    }
  
    function setLive(iframe, videoId) {
      if (showingLive && lastLiveId === videoId) return;
      iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
      showingLive = true;
      lastLiveId = videoId;
    }
  
    function checkLive(iframe) {
      fetch(
        `https://www.googleapis.com/youtube/v3/search?part=id&channelId=${CHANNEL_ID}&type=video&eventType=live&key=${API_KEY}`,
        { cache: "no-store" }
      )
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          if (d && d.items && d.items.length) {
            setLive(iframe, d.items[0].id.videoId);
          } else {
            setPlaylist(iframe);
          }
        })
        .catch(() => {
          // silenzioso: manteniamo lo stato corrente
        });
    }
  
    document.addEventListener("DOMContentLoaded", () => {
      const iframe = document.getElementById("ytPlayer");
      if (!iframe) return;
  
      // fallback immediato
      iframe.src = `https://www.youtube.com/embed/videoseries?list=${PLAYLIST_ID}`;
  
      checkLive(iframe);
      intervalId = setInterval(() => checkLive(iframe), CHECK_INTERVAL);
  
      // pausa polling se tab non visibile
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
          clearInterval(intervalId);
          intervalId = null;
        } else if (!intervalId) {
          checkLive(iframe);
          intervalId = setInterval(() => checkLive(iframe), CHECK_INTERVAL);
        }
      });
    });
  })();
  