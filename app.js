

    const STORAGE_KEY = "chichester_carols_guitar_hub_v1";

    // =========================================================================
    // 2. APPLICATION STATE & PERSISTENCE
    // =========================================================================
    let state = loadState();
    let activeSort = "order";
    let activeTab = "tracker";
    let selectedCallSheetId = state.songs[0]?.id ?? null;
    let fontSizeDrawerOpen = false;
    let showPhraseCues = true;
    let songPickerOpen = false;
    let editingCallSheetSection = null;
    let midiDrawerOpen = false;
    let midiAccess = null;
    let midiOutputId = "";
    let midiFormSongId = null;
    let pendingImport = null;
    let editingSongId = null;
    let deletingSongId = null;

    function normalizeSavedData(parsed) {
      if (!parsed || !Array.isArray(parsed.songs)) throw new Error("Invalid saved setlist.");
      const ids = new Set();
      for (const song of parsed.songs) {
        if (!song || !Number.isSafeInteger(song.id) || song.id < 1 || ids.has(song.id)) {
          throw new Error("Invalid or duplicate song ID.");
        }
        ids.add(song.id);
        if (song.sections !== undefined && (!Array.isArray(song.sections) || !song.sections.every((section) =>
          section && typeof section.chords === "string" &&
          (section.name === undefined || typeof section.name === "string") &&
          (section.timingHint === undefined || typeof section.timingHint === "string") &&
          (section.patch === undefined || typeof section.patch === "string")
        ))) throw new Error("Invalid song sections.");
        if (song.sections?.some((section) => section.name !== undefined) &&
            !song.sections.every((section) => typeof section.name === "string")) {
          throw new Error("Invalid mixed section format.");
        }
      }

      let songs;
      if (parsed.version === 2) {
        if (!parsed.songs.every((song) =>
          typeof song.title === "string" && typeof song.subtitle === "string" &&
          typeof song.rigNote === "string" && typeof song.meter === "string" &&
          typeof song.notes === "string" && typeof song.status === "string" &&
          typeof song.key === "string" && /^[A-G][#b]?$/.test(song.key) &&
          Number.isInteger(song.bpm) && song.bpm >= 1 && song.bpm <= 511 &&
          Array.isArray(song.sections) && song.sections.every((section) => typeof section.name === "string")
        )) throw new Error("Invalid song details.");
        songs = parsed.songs;
      } else {
        if (parsed.version !== undefined) throw new Error("Unsupported backup version.");
        if (parsed.songs.some((song) => !LEGACY_SONGS.some((def) => def.id === song.id))) {
          throw new Error("Unknown song in legacy backup.");
        }
        songs = parsed.songs.length === 0 ? [] : LEGACY_SONGS.map((def) => {
          const saved = parsed.songs.find((song) => song.id === def.id);
          const completeSections = Array.isArray(saved?.sections) &&
            saved.sections.every((section) => typeof section.name === "string");
          return {
            ...def,
            ...saved,
            bpm: Number.isInteger(saved?.bpm) ? saved.bpm :
              Number.isInteger(saved?.midi?.bpm) ? saved.midi.bpm : def.bpm,
            sections: completeSections ? saved.sections : def.sections.map((section, index) => ({
              ...section,
              chords: saved?.sections?.[index]?.chords ?? section.chords
            }))
          };
        });
      }
      return {
        version: 2,
        songs,
        stageMode: true,
        midiChannel: Number.isInteger(parsed.midiChannel) && parsed.midiChannel >= 1 && parsed.midiChannel <= 16 ? parsed.midiChannel : 1,
        callSheetFontSize: Number.isInteger(parsed.callSheetFontSize) &&
          parsed.callSheetFontSize >= 14 && parsed.callSheetFontSize <= 28 ? parsed.callSheetFontSize : 16
      };
    }

    function loadState() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? normalizeSavedData(JSON.parse(raw)) : { version: 2, songs: [], stageMode: true };
      } catch (err) {
        console.error("Failed to load saved state:", err);
        document.getElementById("mainContent").textContent = `Unable to load saved data: ${err.message}. Your saved data has not been changed.`;
        throw err;
      }
    }

    function saveState() {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ version: 2, songs: state.songs, stageMode: true, midiChannel: state.midiChannel || 1, callSheetFontSize: state.callSheetFontSize || 16 })
        );
        return true;
      } catch (err) {
        console.error("Failed to save state:", err);
        showToast("Could not save changes. Keep this page open and try again.");
        return false;
      }
    }

    function showToast(message) {
      const banner = document.getElementById("toastBanner");
      const text = document.getElementById("toastText");
      text.textContent = message;
      banner.classList.remove("hidden");
      clearTimeout(showToast._timer);
      showToast._timer = setTimeout(() => {
        banner.classList.add("hidden");
      }, 2400);
    }

    function toggleDataPanel() {
      document.getElementById("dataPanel").classList.toggle("hidden");
      renderTrackerHeader();
    }

    function exportData() {
      try {
        const data = JSON.stringify({
          version: 2,
          songs: state.songs,
          stageMode: true,
          midiChannel: state.midiChannel || 1,
          callSheetFontSize: state.callSheetFontSize || 16
        }, null, 2);
        const url = URL.createObjectURL(new Blob([data], { type: "application/json" }));
        const link = document.createElement("a");
        link.href = url;
        link.download = "carols-backup.json";
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        document.getElementById("dataStatus").textContent = "Backup download started. Keep the file somewhere safe.";
      } catch (error) {
        console.error("Backup export failed:", error);
        document.getElementById("dataStatus").textContent = `Export failed: ${error.message}`;
      }
    }

    async function prepareImport(input) {
      pendingImport = null;
      const confirmButton = document.getElementById("confirmImportBtn");
      const status = document.getElementById("dataStatus");
      confirmButton.classList.add("hidden");
      const file = input.files[0];
      if (!file) return;
      try {
        if (file.size > 10 * 1024 * 1024) throw new Error("Backup exceeds 10 MB.");
        const raw = await file.text();
        const data = JSON.parse(raw);
        const normalized = normalizeSavedData(data);
        pendingImport = JSON.stringify(normalized);
        status.textContent = `Ready to import ${normalized.songs.length} songs from ${file.name}. This replaces saved data here.`;
        confirmButton.classList.remove("hidden");
      } catch (error) {
        console.error("Backup import failed:", error);
        status.textContent = `Cannot import: ${error.message}`;
      } finally {
        input.value = "";
      }
    }

    function importData() {
      if (pendingImport === null) return;
      try {
        localStorage.setItem(STORAGE_KEY, pendingImport);
        pendingImport = null;
        window.location.reload();
      } catch (error) {
        console.error("Backup restore failed:", error);
        document.getElementById("dataStatus").textContent = `Import failed: ${error.message}`;
      }
    }

    // =========================================================================
    // 3. CHORD TRANSPOSITION ENGINE
    // =========================================================================
    const SHARP_NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const FLAT_NOTES  = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

    function noteToIndex(note) {
      const map = {
        C: 0, "B#": 0,
        "C#": 1, Db: 1,
        D: 2,
        "D#": 3, Eb: 3,
        E: 4, Fb: 4,
        F: 5, "E#": 5,
        "F#": 6, Gb: 6,
        G: 7,
        "G#": 8, Ab: 8,
        A: 9,
        "A#": 10, Bb: 10,
        B: 11, Cb: 11
      };
      return map[note] ?? -1;
    }

    function transposeRoot(note, semitones, preferFlats = false) {
      const idx = noteToIndex(note);
      if (idx === -1) return note;
      const target = (((idx + semitones) % 12) + 12) % 12;
      return preferFlats ? FLAT_NOTES[target] : SHARP_NOTES[target];
    }

    function transposeChordToken(token, semitones, preferFlats = false) {
      if (!semitones) return token;
      // Preserve bracketed notes or N.C.
      if (token.startsWith("[") || token === "N.C.") return token;
      // Match leading note (e.g. F#, Bb, C) + remainder + optional /bassNote
      const match = token.match(/^([A-G][#b]?)((?:(?:maj|min|dim|aug|sus|add|m|M)|[0-9#b+-]|\([0-9#b,+ -]+\))*)(?:\/([A-G][#b]?))?$/);
      if (!match) return token;
      const [, root, qual, bass] = match;
      const newRoot = transposeRoot(root, semitones, preferFlats);
      const newBass = bass ? "/" + transposeRoot(bass, semitones, preferFlats) : "";
      return `${newRoot}${qual}${newBass}`;
    }

    function transposeProgressionString(line, semitones, preferFlats = false) {
      if (!semitones) return line;
      // Split by whitespace while keeping punctuation like | or :|| intact
      return line
        .split(/(\[[^\]]*\]|\s+|[|:]+)/)
        .map((part) => {
          if (/^\s+$/.test(part)) return part;
          if (/^[|:]+$/.test(part) || part.startsWith("(")) return part;
          return transposeChordToken(part, semitones, preferFlats);
        })
        .join("");
    }

    // =========================================================================
    // 4. TRACKER TABLE & CALL SHEET RENDERERS
    // =========================================================================
    const headerIcons = {
      setlist: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
      callSheets: '<path d="M9 18V5l12-2v13M9 9l12-2"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
      fontSize: '<path d="m3 19 6-14 6 14M5 14h8M17 10h6M20 10v9"/>',
      midi: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 6v7m5-7v7m5-7v7M3 13h18"/>',
      data: '<path d="M4 4h16v16H4zM8 4v5h8V4M8 20v-7h8v7"/>',
      cues: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
      click: '<path d="M5 21h14L15 3H9L5 21ZM12 14l5-6M9 17h6"/>',
      refresh: '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.5 9a7 7 0 0 1 11.6-2L20 12M4 12l2.9 5a7 7 0 0 0 11.6-2"/>',
      previous: '<path d="m15 18-6-6 6-6"/>',
      next: '<path d="m9 18 6-6-6-6"/>'
    };

    function headerIcon(name) {
      return `<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${headerIcons[name]}</svg>`;
    }

    function buildSharedHeaderBar(mode, song) {
      const isCallSheet = mode === "callSheets";
      const safeSong = song || state.songs.find((s) => s.id === selectedCallSheetId) || state.songs[0];
      const cuesText = `Cues: ${showPhraseCues ? "ON" : "OFF"}`;
      const btnBaseClass =
        "inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border surface-subtle px-2.5 py-1.5 text-base font-bold transition";
      const headerRowClass = "flex min-h-[2.25rem] flex-wrap items-center justify-between gap-2";

      const leftHtml = isCallSheet
        ? `
          <div class="flex min-w-0 flex-1 items-center gap-2">
            <button
              id="callSheetBackToSetlistBtn"
              type="button"
              onclick="songPickerOpen = false; switchTab('tracker');"
              class="${btnBaseClass} shrink-0 text-muted-custom hover:border-sky-500 hover:text-current"
              title="Back to Setlist"
              aria-label="Back to setlist"
            >
              ${headerIcon("setlist")}
            </button>

            <h2
              id="callSheetSongTitle"
              class="min-w-0 flex-1 truncate text-base font-extrabold tracking-tight sm:text-lg"
            >
              ${escapeHtml(safeSong.title)}
            </h2>
          </div>
        `
        : `
          <div class="flex min-w-0 flex-1 items-center gap-2">
            <button
              id="tabCallSheetsBtn"
              type="button"
              onclick="switchTab('callSheets');"
              class="${btnBaseClass} shrink-0 text-muted-custom hover:border-sky-500 hover:text-current"
              title="Open Call Sheets"
              aria-label="Open call sheets"
            >
              ${headerIcon("callSheets")}
            </button>
            <h1 class="min-w-0 flex-1 truncate text-base font-extrabold tracking-tight sm:text-lg">Setlist</h1>
          </div>
        `;

      const rightHtml = isCallSheet
        ? `
          <div class="relative flex w-full shrink-0 flex-wrap items-center justify-end gap-1.5 sm:w-auto">
            <button
              type="button"
              onclick="midiDrawerOpen = !midiDrawerOpen; renderCallSheetView()"
              class="${btnBaseClass} hover:border-sky-500"
              title="MIDI settings"
              aria-label="MIDI settings"
              aria-expanded="${midiDrawerOpen}"
              aria-controls="midiDrawer"
            >${headerIcon("midi")}</button>
            <button
              id="toggleFontSizeBtn"
              type="button"
              onclick="fontSizeDrawerOpen = !fontSizeDrawerOpen; renderCallSheetView()"
              class="${btnBaseClass} hover:border-sky-500"
              title="Text size"
              aria-label="Call-sheet text size"
              aria-expanded="${fontSizeDrawerOpen}"
              aria-controls="fontSizeDrawer"
            >
              ${headerIcon("fontSize")}
            </button>
            <button
              id="togglePhraseCuesBtn"
              type="button"
              onclick="togglePhraseCuesHandler()"
              class="${btnBaseClass} hover:border-sky-500 ${showPhraseCues ? "text-sky-400" : "text-muted-custom"}"
              title="${escapeHtml(cuesText)}"
              aria-label="Phrase cues"
              aria-pressed="${showPhraseCues}"
            >
              ${headerIcon("cues")}
            </button>
            <button
              id="callSheetClickBtn"
              type="button"
              onclick="toggleMetronomeDrawer()"
              class="${btnBaseClass} hover:border-sky-500"
              title="Click"
              aria-label="Toggle metronome"
            >
              ${headerIcon("click")}
            </button>
            <button
              id="songPickerBtn"
              type="button"
              aria-haspopup="listbox"
              aria-expanded="${songPickerOpen}"
              aria-controls="songPickerMenu"
              onclick="event.stopPropagation(); songPickerOpen = !songPickerOpen; renderCallSheetView();"
              class="${btnBaseClass} gap-1 hover:border-sky-500"
              title="Choose song from setlist"
            >
              <span id="songPickerIndex" class="font-mono-chord text-sky-600 dark:text-sky-400">#${state.songs.indexOf(safeSong) + 1}</span>
              <span>▾</span>
            </button>
            <button
              id="prevSongBtn"
              type="button"
              onclick="stepCallSheetSong(-1)"
              class="${btnBaseClass} hover:border-sky-500"
              title="Previous song"
              aria-label="Previous song"
            >
              ${headerIcon("previous")}
            </button>
            <button
              id="nextSongBtn"
              type="button"
              onclick="stepCallSheetSong(1)"
              class="${btnBaseClass} hover:border-sky-500"
              title="Next song"
              aria-label="Next song"
            >
              ${headerIcon("next")}
            </button>

            <div
              id="songPickerMenu"
              role="listbox"
              aria-label="Select song"
              class="${songPickerOpen ? "" : "hidden "}absolute right-0 top-full z-40 mt-2 max-h-80 w-72 max-w-[90vw] overflow-y-auto rounded-2xl border p-1.5 shadow-xl surface-card"
            >
              ${state.songs
                .map((s) => {
                  const isSelected = s.id === safeSong.id;
                  return `
                    <button
                      type="button"
                      role="option"
                      aria-selected="${isSelected}"
                      onclick="selectCallSheetSong(${s.id})"
                      class="flex min-h-[44px] w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm transition ${
                        isSelected
                          ? "bg-sky-600 font-bold text-white"
                          : "font-semibold hover:bg-sky-500/10"
                      }"
                    >
                      <span class="truncate">
                        <span class="font-mono-chord opacity-80">#${state.songs.indexOf(s) + 1}</span> · ${escapeHtml(s.title)}
                      </span>
                      <span class="shrink-0 rounded-md px-1.5 py-0.5 font-mono-chord text-xs ${
                        isSelected ? "bg-white/20 text-white" : "surface-subtle text-muted-custom"
                      }">
                        ${escapeHtml(s.key)}
                      </span>
                    </button>
                  `;
                })
                .join("")}
            </div>
          </div>
        `
        : `
          <div class="flex shrink-0 items-center gap-1.5">
            <button type="button" onclick="toggleDataPanel()" class="${btnBaseClass} hover:border-sky-500" title="Backup and restore" aria-label="Backup and restore" aria-controls="dataPanel" aria-expanded="${!document.getElementById("dataPanel").classList.contains("hidden")}">
              ${headerIcon("data")}
            </button>
            <button type="button" onclick="toggleMidiSetup()" class="${btnBaseClass} hover:border-sky-500" title="MIDI device setup" aria-label="MIDI device setup" aria-controls="midiSetup" aria-expanded="${!document.getElementById("midiSetup").classList.contains("hidden")}">
              ${headerIcon("midi")}
            </button>
            <button
              id="toggleMetronomeBtn"
              type="button"
              onclick="toggleMetronomeDrawer()"
              class="${btnBaseClass} hover:border-sky-500"
              title="Click"
              aria-label="Toggle metronome"
            >
              ${headerIcon("click")}
            </button>
            <button
              id="refreshBtn"
              type="button"
              onclick="window.location.reload()"
              class="${btnBaseClass} hover:border-sky-500"
              title="Refresh app"
              aria-label="Refresh app"
            >
              ${headerIcon("refresh")}
            </button>
          </div>
        `;

      return `
        <div class="${headerRowClass}">
          ${leftHtml}
          ${rightHtml}
        </div>
      `;
    }

    function renderTrackerHeader() {
      const slot = document.getElementById("trackerHeaderSlot");
      if (slot) {
        slot.innerHTML = buildSharedHeaderBar("tracker");
      }
      document.getElementById("midiChannel").value = state.midiChannel || 1;
    }

    function escapeHtml(value) {
      return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }

    function getStatusBadgeClasses(status) {
      switch (status) {
        case "Service-Ready":
          return "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
        case "Shaping Up":
          return "border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-300";
        default:
          return "border-rose-500/40 bg-rose-500/15 text-rose-700 dark:text-rose-300";
      }
    }

    function getSortedFilteredSongs() {
      const priorityRank = {
        "Rough Edges": 0,
        "Shaping Up": 1,
        "Service-Ready": 2
      };

      return [...state.songs].sort((a, b) => {
        if (activeSort === "status") {
          const pDiff = (priorityRank[a.status] ?? 9) - (priorityRank[b.status] ?? 9);
          return pDiff !== 0 ? pDiff : state.songs.indexOf(a) - state.songs.indexOf(b);
        }
        return state.songs.indexOf(a) - state.songs.indexOf(b);
      });
    }

    function updateSortHeaderIndicators() {
      const orderInd = document.getElementById("sortOrderIndicator");
      const statusInd = document.getElementById("sortStatusIndicator");
      const orderBtn = document.getElementById("sortOrderHeaderBtn");
      const statusBtn = document.getElementById("sortStatusHeaderBtn");

      if (orderInd) {
        orderInd.textContent = activeSort === "order" ? "▾" : "";
      }
      if (statusInd) {
        statusInd.textContent = activeSort === "status" ? "▾" : "";
      }
      if (orderBtn) {
        orderBtn.classList.toggle("text-sky-400", activeSort === "order");
      }
      if (statusBtn) {
        statusBtn.classList.toggle("text-sky-400", activeSort === "status");
      }
    }

    function toggleHeaderSort(column) {
      activeSort = column === "status" ? "status" : "order";
      renderTrackerTable();
    }

    function renderReadinessSummary() {
      // Optional readiness counters if present in DOM
      const readyCountEl = document.getElementById("readyCount");
      const shapingCountEl = document.getElementById("shapingCount");
      const roughCountEl = document.getElementById("roughCount");
      if (readyCountEl) {
        readyCountEl.textContent = state.songs.filter((s) => s.status === "Service-Ready").length;
      }
      if (shapingCountEl) {
        shapingCountEl.textContent = state.songs.filter((s) => s.status === "Shaping Up").length;
      }
      if (roughCountEl) {
        roughCountEl.textContent = state.songs.filter((s) => s.status === "Rough Edges").length;
      }
    }

    function editSong(id = null) {
      editingSongId = id;
      const song = id === null ? null : state.songs.find((item) => item.id === id);
      document.getElementById("songEditorTitle").textContent = song ? "Edit song" : "Add song";
      document.getElementById("requestDeleteSongBtn").classList.toggle("hidden", !song);
      document.getElementById("songTitle").value = song?.title ?? "";
      document.getElementById("songSubtitle").value = song?.subtitle ?? "";
      document.getElementById("songRig").value = song?.rigNote ?? "";
      document.getElementById("songMeter").value = song?.meter ?? "4/4";
      cancelDeleteSong();
      document.getElementById("songEditor").classList.remove("hidden");
      document.getElementById("songEditor").scrollIntoView({ block: "nearest" });
      document.getElementById("songTitle").focus();
    }

    function closeSongEditor() {
      editingSongId = null;
      document.getElementById("songEditor").classList.add("hidden");
    }

    function saveSong(event) {
      event.preventDefault();
      const title = document.getElementById("songTitle").value.trim();
      const meter = document.getElementById("songMeter").value.trim();
      if (!title || !meter) {
        showToast("Enter a song title and meter.");
        return;
      }
      const fields = {
        title,
        subtitle: document.getElementById("songSubtitle").value.trim(),
        rigNote: document.getElementById("songRig").value.trim(),
        meter
      };
      const previousSongs = state.songs;
      if (editingSongId === null) {
        const id = Math.max(0, ...state.songs.map((song) => song.id)) + 1;
        state.songs = [...state.songs, {
          id, ...fields, key: "C", bpm: 100, status: "Rough Edges",
          notes: "", midi: null, sections: []
        }];
      } else {
        state.songs = state.songs.map((song) =>
          song.id === editingSongId ? { ...song, ...fields } : song
        );
      }
      if (!saveState()) {
        state.songs = previousSongs;
        return;
      }
      if (selectedCallSheetId === null) selectedCallSheetId = state.songs[0].id;
      closeSongEditor();
      renderTrackerTable();
      renderCallSheetView();
      showToast("Song saved.");
    }

    function requestDeleteSong(id) {
      const song = state.songs.find((item) => item.id === id);
      deletingSongId = id;
      closeSongEditor();
      document.getElementById("deleteSongMessage").textContent = `Delete "${song.title}" and its call sheet and MIDI settings?`;
      document.getElementById("deleteSongPanel").classList.remove("hidden");
      document.getElementById("deleteSongPanel").scrollIntoView({ block: "nearest" });
    }

    function cancelDeleteSong() {
      deletingSongId = null;
      document.getElementById("deleteSongPanel").classList.add("hidden");
    }

    function moveSong(id, direction) {
      const index = state.songs.findIndex((song) => song.id === id);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= state.songs.length) return;

      const previousSongs = state.songs;
      state.songs = [...previousSongs];
      [state.songs[index], state.songs[nextIndex]] = [state.songs[nextIndex], state.songs[index]];
      if (!saveState()) {
        state.songs = previousSongs;
        return;
      }
      activeSort = "order";
      renderTrackerTable();
      renderCallSheetView();
      const focusDirection = nextIndex === 0 ? 1 : nextIndex === state.songs.length - 1 ? -1 : direction;
      document.getElementById(`moveSong-${id}-${focusDirection}`)?.focus();
      showToast(`${state.songs[nextIndex].title} moved to #${nextIndex + 1}.`);
    }

    function deleteSong() {
      if (deletingSongId === null) return;
      const previousSongs = state.songs;
      state.songs = state.songs.filter((song) => song.id !== deletingSongId);
      if (!saveState()) {
        state.songs = previousSongs;
        return;
      }
      if (selectedCallSheetId === deletingSongId) {
        selectedCallSheetId = state.songs[0]?.id ?? null;
        editingCallSheetSection = null;
        midiFormSongId = null;
      }
      cancelDeleteSong();
      renderTrackerTable();
      renderCallSheetView();
      showToast("Song deleted.");
    }

    function updateSongKey(id, key) {
      const song = state.songs.find((s) => s.id === id);
      const previousKey = song.key;
      const previousSections = song.sections;
      const semitones = noteToIndex(key) - noteToIndex(previousKey);
      const preferFlats = key.includes("b") || key === "F";
      song.sections = song.sections.map((section) => ({
        ...section,
        chords: transposeProgressionString(section.chords, semitones, preferFlats)
      }));
      song.key = key;
      const saved = saveState();
      if (!saved) {
        song.key = previousKey;
        song.sections = previousSections;
      }
      renderTrackerTable();
      renderCallSheetView();
      if (saved) showToast(`Key changed to ${key}; call sheet transposed and saved.`);
    }

    function updateSongBpm(id, input) {
      const song = state.songs.find((s) => s.id === id);
      if (!input.reportValidity() || input.value === "") {
        input.value = song.bpm;
        showToast("Enter a whole BPM from 1 to 511.");
        return;
      }
      const previous = song.bpm;
      song.bpm = Number(input.value);
      if (!saveState()) {
        song.bpm = previous;
        input.value = previous;
        return;
      }
      const selectedSong = state.songs.find((s) => s.id === selectedCallSheetId);
      if (selectedSong) document.getElementById("midiBpm").value = selectedSong.bpm;
      renderTrackerTable();
      sendSongMidi(song, true);
    }

    function updateSongStatus(id, newStatus) {
      const target = state.songs.find((s) => s.id === id);
      if (!target) return;
      target.status = newStatus;
      const saved = saveState();
      renderTrackerTable();
      if (saved) showToast(`#${state.songs.indexOf(target) + 1} marked as ${newStatus}`);
    }

    function updateSongNotes(id, newNotes) {
      const target = state.songs.find((s) => s.id === id);
      if (!target) return;
      target.notes = newNotes;
      if (saveState()) showToast(`Saved guitar notes for #${state.songs.indexOf(target) + 1}`);
    }

    function renderTrackerTable() {
      renderReadinessSummary();
      updateSortHeaderIndicators();
      const tbody = document.getElementById("trackerTableBody");
      const rows = getSortedFilteredSongs();

      if (rows.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="6" class="px-6 py-10 text-center text-sm text-muted-custom">
              No songs yet. Add a song to get started.
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = rows
        .map((song) => {
          return `
            <tr class="align-top transition hover:bg-sky-500/[0.03]">
              <!-- Setlist order -->
              <td class="sticky left-0 z-10 border-r px-3 py-3.5 text-center font-mono-chord text-sm font-extrabold surface-card" style="border-color: var(--border-subtle);">
                #${state.songs.indexOf(song) + 1}
              </td>

              <!-- Song & Arrangement -->
              <td class="px-4 py-3.5">
                <div class="font-bold leading-snug">${escapeHtml(song.title)}</div>
                <div class="mt-0.5 text-xs text-muted-custom">${escapeHtml(song.subtitle)}</div>
                <button
                  type="button"
                  onclick="openCallSheetForSong(${song.id})"
                  class="mt-2 inline-flex items-center gap-1 rounded-lg bg-sky-500/10 px-2.5 py-1 text-xs font-semibold text-sky-600 dark:text-sky-400 transition hover:bg-sky-500/20"
                >
                  <span>Open Call Sheet →</span>
                </button>
                <div class="flex flex-wrap gap-2">
                  <button type="button" onclick="editSong(${song.id})" class="min-h-[44px] px-2 text-xs font-semibold text-muted-custom hover:text-sky-400">Edit</button>
                  <button id="moveSong-${song.id}--1" type="button" onclick="moveSong(${song.id}, -1)"
                    aria-label="Move ${escapeHtml(song.title)} up in setlist" title="Move up"
                    ${state.songs.indexOf(song) === 0 ? "disabled" : ""}
                    class="min-h-[44px] min-w-[44px] rounded-lg border text-base font-bold surface-subtle hover:border-sky-500 disabled:opacity-30">↑</button>
                  <button id="moveSong-${song.id}-1" type="button" onclick="moveSong(${song.id}, 1)"
                    aria-label="Move ${escapeHtml(song.title)} down in setlist" title="Move down"
                    ${state.songs.indexOf(song) === state.songs.length - 1 ? "disabled" : ""}
                    class="min-h-[44px] min-w-[44px] rounded-lg border text-base font-bold surface-subtle hover:border-sky-500 disabled:opacity-30">↓</button>
                </div>
              </td>

              <!-- Key & Rig -->
              <td class="px-3 py-3.5">
                <label class="inline-flex items-center gap-2 text-sm font-bold">
                  Key
                  <select
                    aria-label="Key for ${escapeHtml(song.title)}"
                    onchange="updateSongKey(${song.id}, this.value)"
                    class="min-h-[44px] rounded-lg border px-2.5 py-1 font-mono-chord text-base font-bold surface-subtle"
                  >
                    ${["C", "C#", "Db", "D", "D#", "Eb", "E", "F", "F#", "Gb", "G", "G#", "Ab", "A", "A#", "Bb", "B"].map((key) =>
                      `<option value="${key}" ${song.key === key ? "selected" : ""}>${key}</option>`
                    ).join("")}
                  </select>
                </label>
                <div class="mt-1.5 max-w-[180px] text-xs text-muted-custom">
                  ${escapeHtml(song.rigNote)}
                </div>
              </td>

              <!-- Tempo / Meter -->
              <td class="px-3 py-3.5 whitespace-nowrap">
                <label class="inline-flex items-center gap-1 font-mono-chord text-sm font-bold">
                  <input type="number" min="1" max="511" required value="${song.bpm}"
                    aria-label="BPM for ${escapeHtml(song.title)}"
                    onchange="updateSongBpm(${song.id}, this)"
                    class="min-h-[44px] w-20 rounded-lg border px-2 text-base surface-subtle" /> BPM
                </label>
                ${song.secondaryBpm ? `<div class="text-xs text-muted-custom">Alternate: ${song.secondaryBpm} BPM</div>` : ""}
                <div class="mt-0.5 text-xs text-muted-custom">${escapeHtml(song.meter)}</div>
                <button
                  type="button"
                  onclick="loadBpmToClickForSong(${song.id})"
                  class="mt-1.5 rounded-md border px-2 py-0.5 text-[11px] font-semibold text-muted-custom hover:border-sky-500 hover:text-sky-500 surface-subtle"
                >
                  Set Click
                </button>
              </td>

              <!-- Status Selector -->
              <td class="px-3 py-3.5 whitespace-nowrap">
                <select
                  aria-label="Status for ${escapeHtml(song.title)}"
                  onchange="updateSongStatus(${song.id}, this.value)"
                  class="rounded-xl border px-2.5 py-1.5 text-xs font-bold cursor-pointer ${getStatusBadgeClasses(song.status)}"
                >
                  <option value="Rough Edges" ${song.status === "Rough Edges" ? "selected" : ""}>Rough Edges</option>
                  <option value="Shaping Up" ${song.status === "Shaping Up" ? "selected" : ""}>Shaping Up</option>
                  <option value="Service-Ready" ${song.status === "Service-Ready" ? "selected" : ""}>Service-Ready</option>
                </select>
              </td>

              <!-- Editable Guitar Notes -->
              <td class="px-4 py-3.5 w-72">
                <textarea
                  rows="3"
                  aria-label="Guitar notes for ${escapeHtml(song.title)}"
                  onchange="updateSongNotes(${song.id}, this.value)"
                  class="h-24 w-full resize-none rounded-xl border px-3 py-2 text-xs leading-relaxed surface-subtle focus:border-sky-500 focus:outline-none"
                >${escapeHtml(song.notes)}</textarea>
              </td>
            </tr>
          `;
        })
        .join("");
    }

    // Split a transposed chord line by '|' bars while preserving repeat markers & prose notes
    function renderBarBlocksHtml(transposedLine) {
      const trimmed = String(transposedLine || "").trim();
      if (!trimmed) return "";

      // If a section is a descriptive prose note with no bar pipes, render cleanly
      if (!trimmed.includes("|")) {
        return `<div class="bar-note-text text-muted-custom">${escapeHtml(trimmed)}</div>`;
      }

      const rawBars = trimmed.split("|");
      let barIndex = 0;

      const items = rawBars
        .map((chunk) => chunk.trim())
        .filter((chunk) => chunk.length > 0)
        .map((chunk) => {
          let prefixMarker = "";
          let suffixMarker = "";
          let content = chunk;

          // Pull leading repeat start (e.g. "||:" or ":") if present
          const leadingRepeat = content.match(/^(\|\|:|:)\s*(.*)$/);
          if (leadingRepeat) {
            prefixMarker = leadingRepeat[1];
            content = leadingRepeat[2].trim();
          }

          // Pull trailing repeat end (e.g. ":||" or ":") if present
          const trailingRepeat = content.match(/^(.*?)\s*([:]*\|\||:)$/);
          if (trailingRepeat && trailingRepeat[1].trim().length > 0) {
            content = trailingRepeat[1].trim();
            suffixMarker = trailingRepeat[2];
          }

          const parts = [];
          if (prefixMarker) {
            parts.push(`<span class="bar-marker text-sky-600 dark:text-sky-400">${escapeHtml(prefixMarker)}</span>`);
          }
          if (content) {
            const shadeClass = barIndex % 2 === 0 ? "bar-cell-even" : "bar-cell-odd";
            barIndex += 1;
            parts.push(`<span class="bar-cell ${shadeClass}">${escapeHtml(content)}</span>`);
          }
          if (suffixMarker) {
            parts.push(`<span class="bar-marker text-sky-600 dark:text-sky-400">${escapeHtml(suffixMarker)}</span>`);
          }

          return `<span class="inline-flex items-center gap-1">${parts.join("")}</span>`;
        })
        .filter((item) => item.length > 0);

      if (items.length === 0) {
        return `<div class="bar-note-text text-muted-custom">${escapeHtml(trimmed)}</div>`;
      }

      return `<div class="bar-grid font-mono-chord text-base font-bold">${items.join("")}</div>`;
    }

    function editCallSheetSection(sectionIndex) {
      editingCallSheetSection = `${selectedCallSheetId}:${sectionIndex}`;
      renderCallSheetView();
      document.getElementById("sectionChordsEditor").focus();
    }

    function updateCallSheetSection(songId, sectionIndex, field, value) {
      const song = state.songs.find((s) => s.id === songId);
      song.sections[sectionIndex][field] = value;
      const saved = saveState();
      document.getElementById("sectionSaveStatus").textContent = saved
        ? "Saved on this device."
        : "Not saved. Keep this page open and try editing again.";
    }

    function finishEditingCallSheetSection() {
      if (!saveState()) return;
      editingCallSheetSection = null;
      renderCallSheetView();
    }

    function applyCallSheetFontSize() {
      const size = state.callSheetFontSize || 16;
      document.getElementById("callSheetContainer").style.setProperty("--call-sheet-font-size", `${size}px`);
      document.getElementById("callSheetFontSize").value = size;
      document.getElementById("fontSizeReadout").textContent = `${size}px`;
    }

    function setCallSheetFontSize(size) {
      state.callSheetFontSize = Math.min(28, Math.max(14, size));
      applyCallSheetFontSize();
      saveState();
    }

    function setMidiStatus(message) {
      document.querySelectorAll(".midi-status").forEach((status) => {
        status.textContent = message;
      });
    }

    function toggleMidiSetup() {
      document.getElementById("midiSetup").classList.toggle("hidden");
      renderTrackerHeader();
    }

    function saveMidiChannel(input) {
      if (!input.reportValidity() || input.value === "") {
        input.value = state.midiChannel || 1;
        setMidiStatus("Enter a MIDI channel from 1 to 16.");
        return;
      }
      const previous = state.midiChannel;
      state.midiChannel = Number(input.value);
      if (!saveState()) {
        state.midiChannel = previous;
        input.value = previous || 1;
        setMidiStatus("MIDI channel not saved.");
      } else {
        setMidiStatus(`MIDI channel ${state.midiChannel} saved.`);
      }
    }

    function refreshMidiOutputs() {
      const select = document.getElementById("midiOutput");
      select.replaceChildren(new Option("Select output", ""));
      for (const output of midiAccess.outputs.values()) {
        if (output.state === "connected") {
          select.add(new Option(output.name || "Unnamed MIDI output", output.id));
        }
      }
      if (midiOutputId && midiAccess.outputs.get(midiOutputId)?.state !== "connected") {
        midiOutputId = "";
        setMidiStatus("MIDI output disconnected. Select an available output.");
      }
      select.value = midiOutputId;
    }

    async function connectMidi() {
      if (!navigator.requestMIDIAccess) {
        setMidiStatus("Web MIDI is unavailable in this browser. Open the site in MIDIWeb with MIDI access enabled.");
        return;
      }
      try {
        midiAccess = await navigator.requestMIDIAccess();
        midiAccess.onstatechange = refreshMidiOutputs;
        refreshMidiOutputs();
        setMidiStatus("MIDI access enabled. Select an output; pair Bluetooth MIDI in MIDIWeb/iPadOS if it is not listed.");
      } catch (error) {
        console.error("MIDI access failed:", error);
        setMidiStatus(`MIDI access failed: ${error.message}`);
      }
    }

    function selectMidiOutput(id) {
      midiOutputId = id;
      const output = midiAccess?.outputs.get(id);
      setMidiStatus(output ? `Selected: ${output.name || "MIDI output"}.` : "Select a MIDI output.");
    }

    function updateMidiForm(song) {
      const config = song.midi || {};
      document.getElementById("midiProgram").value = config.program ?? "";
      document.getElementById("midiCC").value = config.cc ?? "";
      document.getElementById("midiCCValue").value = config.ccValue ?? "";
      document.getElementById("midiBpm").value = song.bpm;
    }

    function saveMidiSettings(event) {
      event.preventDefault();
      const form = event.currentTarget;
      if (!form.reportValidity()) return;
      const optionalNumber = (id) => {
        const value = document.getElementById(id).value;
        return value === "" ? null : Number(value);
      };
      const config = {
        program: optionalNumber("midiProgram"),
        cc: optionalNumber("midiCC"),
        ccValue: optionalNumber("midiCCValue")
      };
      if ((config.cc === null) !== (config.ccValue === null)) {
        setMidiStatus("Enter both a CC number and value, or leave both blank.");
        return;
      }
      const song = state.songs.find((s) => s.id === selectedCallSheetId);
      const previousMidi = song.midi;
      song.midi = config;
      if (saveState()) {
        setMidiStatus("MIDI settings saved on this device. Choose a song or use Send now.");
      } else {
        song.midi = previousMidi;
        setMidiStatus("MIDI settings not saved. Keep this page open and try again.");
      }
    }

    function sendCurrentSongMidi() {
      const song = state.songs.find((s) => s.id === selectedCallSheetId);
      sendSongMidi(song);
    }

    function sendSongMidi(song, tempoOnly = false) {
      const config = song.midi || {};
      const output = midiAccess?.outputs.get(midiOutputId);
      if (!output || output.state !== "connected") {
        const message = `MIDI not sent for ${song.title}: connect and select an output.`;
        setMidiStatus(message);
        showToast(message);
        return;
      }
      try {
        const channel = (state.midiChannel || 1) - 1;
        if (!tempoOnly && config.program != null) output.send([0xC0 | channel, config.program]);
        if (!tempoOnly && config.cc != null) output.send([0xB0 | channel, config.cc, config.ccValue]);
        output.send([0xB0 | channel, 5, Math.floor(song.bpm / 128)]);
        output.send([0xB0 | channel, 6, song.bpm % 128]);
        setMidiStatus(`MIDI sent for ${song.title} to ${output.name || "selected output"}.`);
      } catch (error) {
        console.error("MIDI send failed:", error);
        const message = `MIDI send failed for ${song.title}: ${error.message}`;
        setMidiStatus(message);
        showToast(message);
      }
    }

    function addCallSheetSection() {
      const song = state.songs.find((s) => s.id === selectedCallSheetId);
      song.sections.push({ name: "New section", chords: "", timingHint: "", patch: "" });
      if (!saveState()) {
        song.sections.pop();
        return;
      }
      editCallSheetSection(song.sections.length - 1);
      document.getElementById("sectionTitleEditor").focus();
    }

    function removeCallSheetSection(sectionIndex) {
      const song = state.songs.find((s) => s.id === selectedCallSheetId);
      const [removed] = song.sections.splice(sectionIndex, 1);
      if (!saveState()) {
        song.sections.splice(sectionIndex, 0, removed);
        return;
      }
      editingCallSheetSection = null;
      renderCallSheetView();
      showToast("Section removed.");
    }

    function renderCallSheetView() {
      const song = state.songs.find((s) => s.id === selectedCallSheetId) || state.songs[0];
      if (!song) {
        selectedCallSheetId = null;
        document.getElementById("callSheetHeaderSlot").innerHTML = "";
        document.getElementById("callSheetContainer").innerHTML = "";
        return;
      }
      selectedCallSheetId = song.id;

      const headerSlot = document.getElementById("callSheetHeaderSlot");
      if (headerSlot) {
        headerSlot.innerHTML = buildSharedHeaderBar("callSheets", song);
      }

      document.getElementById("fontSizeDrawer").classList.toggle("hidden", !fontSizeDrawerOpen);
      document.getElementById("midiDrawer").classList.toggle("hidden", !midiDrawerOpen);
      if (midiFormSongId !== song.id) {
        updateMidiForm(song);
        midiFormSongId = song.id;
      }
      applyCallSheetFontSize();

      const sectionsHtml = song.sections
        .map((sec, sectionIndex) => {
          const isEditing = editingCallSheetSection === `${song.id}:${sectionIndex}`;
          const hintHtml =
            showPhraseCues && sec.timingHint
              ? `<div class="section-notes mt-1.5 whitespace-pre-wrap text-sm font-medium text-amber-700 dark:text-amber-300">${escapeHtml(
                  sec.timingHint
                )}</div>`
              : "";
          return `
            <div class="rounded-xl border p-3 surface-subtle">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div class="min-w-0 flex-1">
                  <h3 class="text-sm font-extrabold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                    ${escapeHtml(sec.name)}
                  </h3>
                  ${sec.patch ? `<div class="section-patch mt-1 break-words text-sm font-semibold text-muted-custom">Patch: ${escapeHtml(sec.patch)}</div>` : ""}
                </div>
                <button
                  type="button"
                  class="min-h-[44px] px-2 py-2 text-xs text-muted-custom hover:text-sky-400"
                  onclick="${isEditing ? "finishEditingCallSheetSection()" : `editCallSheetSection(${sectionIndex})`}"
                  aria-label="${isEditing ? "Done editing" : "Edit section"} ${escapeHtml(sec.name)}"
                >${isEditing ? "Done" : "Edit bars"}</button>
              </div>
              <div class="mt-2">
                ${isEditing ? `
                  <label for="sectionTitleEditor" class="block text-sm font-semibold">Section title</label>
                  <input
                    id="sectionTitleEditor"
                    type="text"
                    value="${escapeHtml(sec.name)}"
                    oninput="updateCallSheetSection(${song.id}, ${sectionIndex}, 'name', this.value)"
                    class="mb-3 mt-2 w-full rounded-xl border p-3 text-base surface-card focus:border-sky-500 focus:outline-none"
                  />
                  <label for="sectionPatchEditor" class="block text-sm font-semibold">Guitar patch</label>
                  <input
                    id="sectionPatchEditor"
                    type="text"
                    value="${escapeHtml(sec.patch || "")}"
                    placeholder="e.g. Clean + shimmer"
                    oninput="updateCallSheetSection(${song.id}, ${sectionIndex}, 'patch', this.value)"
                    class="mb-3 mt-2 w-full rounded-xl border p-3 text-base surface-card focus:border-sky-500 focus:outline-none"
                  />
                  <label for="sectionChordsEditor" class="block text-sm font-semibold">
                    Bars in selected key (${escapeHtml(song.key)})
                  </label>
                  <p id="sectionEditorHelp" class="my-2 text-sm text-muted-custom">
                    Separate bars with | (e.g. C | F | G). Edit chords, add a bar with |,
                    or remove a bar and its separator. Keep repeat markers such as ||: and :||.
                    Changes save automatically on this device, not to other devices.
                  </p>
                  <textarea
                    id="sectionChordsEditor"
                    rows="5"
                    aria-describedby="sectionEditorHelp sectionSaveStatus"
                    oninput="updateCallSheetSection(${song.id}, ${sectionIndex}, 'chords', this.value)"
                    class="w-full rounded-xl border p-3 font-mono-chord text-base leading-relaxed surface-card focus:border-sky-500 focus:outline-none"
                  >${escapeHtml(sec.chords)}</textarea>
                  <label for="sectionNotesEditor" class="mt-3 block text-sm font-semibold">Section notes / cues</label>
                  <textarea
                    id="sectionNotesEditor"
                    rows="3"
                    oninput="updateCallSheetSection(${song.id}, ${sectionIndex}, 'timingHint', this.value)"
                    class="mt-2 w-full rounded-xl border p-3 text-base surface-card focus:border-sky-500 focus:outline-none"
                  >${escapeHtml(sec.timingHint || "")}</textarea>
                  <p id="sectionSaveStatus" role="status" class="mt-2 text-sm text-muted-custom"></p>
                  <button
                    type="button"
                    onclick="removeCallSheetSection(${sectionIndex})"
                    class="mt-3 min-h-[44px] rounded-xl border border-rose-400/40 px-3 py-2 text-sm font-semibold text-rose-400 hover:border-rose-400"
                    aria-label="Remove section ${escapeHtml(sec.name)}"
                  >Remove section</button>
                ` : renderBarBlocksHtml(sec.chords)}
              </div>
              ${isEditing ? "" : hintHtml}
            </div>
          `;
        })
        .join("");

      document.getElementById("callSheetContainer").innerHTML = `
        <div class="rounded-2xl border p-4 surface-card shadow-sm">
          <div class="grid gap-2.5 md:grid-cols-2">
            ${sectionsHtml}
          </div>
          <button
            type="button"
            onclick="addCallSheetSection()"
            class="mt-3 min-h-[44px] rounded-xl border px-3 py-2 text-sm font-semibold text-muted-custom hover:border-sky-500 surface-subtle"
          >+ Add section</button>
        </div>
      `;
    }

    // =========================================================================
    // 5. WEB AUDIO METRONOME / TAP TEMPO
    // =========================================================================
    // Web Audio Click Track
    let audioCtx = null;
    let metroTimer = null;
    let metroPlaying = false;
    let currentBeat = 0;
    let tapTimes = [];

    function renderBeatDots() {
      const beats = Number(document.getElementById("timeSigSelect").value) || 4;
      const container = document.getElementById("beatDots");
      container.innerHTML = Array.from({ length: beats }, (_, i) => {
        const active = metroPlaying && currentBeat === i;
        return `<span class="h-3.5 w-3.5 rounded-full transition ${
          active
            ? i === 0
              ? "scale-125 bg-amber-400 shadow"
              : "scale-110 bg-sky-500 shadow"
            : "bg-slate-400/30"
        }"></span>`;
      }).join("");
    }

    function playClickSound(isAccent) {
      try {
        if (!audioCtx) {
          audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === "suspended") audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "triangle";
        osc.frequency.value = isAccent ? 1050 : 720;
        gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.06);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.065);
      } catch (err) {
        console.error("Click audio error:", err);
      }
    }

    function startMetronome() {
      stopMetronome();
      const bpm = Math.min(240, Math.max(35, Number(document.getElementById("bpmInput").value) || 100));
      const beatsPerBar = Number(document.getElementById("timeSigSelect").value) || 4;
      const intervalMs = (60 / bpm) * 1000;

      metroPlaying = true;
      currentBeat = 0;
      document.getElementById("metroPlayIcon").textContent = "■";
      document.getElementById("metroPlayLabel").textContent = "Stop Click";

      const tick = () => {
        playClickSound(currentBeat === 0);
        renderBeatDots();
        currentBeat = (currentBeat + 1) % beatsPerBar;
      };

      tick();
      metroTimer = setInterval(tick, intervalMs);
    }

    function stopMetronome() {
      metroPlaying = false;
      clearInterval(metroTimer);
      metroTimer = null;
      currentBeat = 0;
      document.getElementById("metroPlayIcon").textContent = "▶";
      document.getElementById("metroPlayLabel").textContent = "Start Click";
      renderBeatDots();
    }

    function loadBpmToClick(bpm, meter) {
      document.getElementById("bpmInput").value = bpm;
      const sigSelect = document.getElementById("timeSigSelect");
      if (meter.includes("6/8")) sigSelect.value = "6";
      else if (meter.includes("12/8")) sigSelect.value = "12";
      else if (meter.includes("3/4")) sigSelect.value = "3";
      else sigSelect.value = "4";

      document.getElementById("metronomeDrawer").classList.remove("hidden");
      renderBeatDots();
      if (metroPlaying) startMetronome();
      showToast(`Click set to ${bpm} BPM (${meter})`);
    }

    function loadBpmToClickForSong(id) {
      const song = state.songs.find((item) => item.id === id);
      loadBpmToClick(song.bpm, song.meter);
    }

    function toggleMetronomeDrawer() {
      const drawer = document.getElementById("metronomeDrawer");
      drawer.classList.toggle("hidden");
      renderBeatDots();
    }

    document.getElementById("metroPlayBtn").addEventListener("click", () => {
      if (metroPlaying) stopMetronome();
      else startMetronome();
    });
    document.getElementById("bpmInput").addEventListener("change", () => {
      if (metroPlaying) startMetronome();
    });
    document.getElementById("timeSigSelect").addEventListener("change", () => {
      renderBeatDots();
      if (metroPlaying) startMetronome();
    });
    document.getElementById("tapTempoBtn").addEventListener("click", () => {
      const now = performance.now();
      tapTimes = tapTimes.filter((t) => now - t < 2500);
      tapTimes.push(now);
      if (tapTimes.length >= 2) {
        let sum = 0;
        for (let i = 1; i < tapTimes.length; i++) sum += tapTimes[i] - tapTimes[i - 1];
        const avgMs = sum / (tapTimes.length - 1);
        const tappedBpm = Math.min(240, Math.max(35, Math.round(60000 / avgMs)));
        document.getElementById("bpmInput").value = tappedBpm;
      if (metroPlaying) startMetronome();
    }
    playClickSound(true);
  });

  // =========================================================================
    // In switchTab(tabName)
    function switchTab(tabName) {
      if (tabName === "callSheets" && state.songs.length === 0) {
        showToast("Add a song before opening call sheets.");
        return;
      }
      activeTab = tabName;
      document.getElementById(tabName === "callSheets" ? "callSheetControls" : "trackerControls")
        .appendChild(document.getElementById("metronomeDrawer"));
      syncHeaderVisibilityForTab(tabName);
      const mainContent = document.getElementById("mainContent");
      const trackerView = document.getElementById("trackerView");
      const callView = document.getElementById("callSheetsView");

      if (tabName === "tracker") {
        if (mainContent) mainContent.classList.remove("hidden");
        trackerView.classList.remove("hidden");
        callView.classList.add("hidden");
        renderTrackerHeader();
      } else {
        if (mainContent) mainContent.classList.add("hidden");
        callView.classList.remove("hidden");
        trackerView.classList.add("hidden");
        renderCallSheetView();
        sendCurrentSongMidi();
      }
    }

    function openCallSheetForSong(id) {
      selectedCallSheetId = id;
      songPickerOpen = false;
      switchTab("callSheets");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function selectCallSheetSong(id) {
      selectedCallSheetId = Number(id);
      songPickerOpen = false;
      renderCallSheetView();
      sendCurrentSongMidi();
    }

    function stepCallSheetSong(delta) {
      songPickerOpen = false;
      const songs = state.songs;
      if (!Array.isArray(songs) || songs.length === 0) return;

      const orderedSongs = songs;
      const currentIdx = orderedSongs.findIndex((s) => s.id === selectedCallSheetId);
      const safeIdx = currentIdx === -1 ? 0 : currentIdx;
      const nextIdx = (safeIdx + delta + orderedSongs.length) % orderedSongs.length;
      selectedCallSheetId = orderedSongs[nextIdx].id;
      renderCallSheetView();
      sendCurrentSongMidi();
    }

    function togglePhraseCuesHandler() {
      showPhraseCues = !showPhraseCues;
      renderCallSheetView();
    }

    document.addEventListener("click", (e) => {
      if (!songPickerOpen) return;
      const menu = document.getElementById("songPickerMenu");
      const btn = document.getElementById("songPickerBtn");
      if (menu && btn && !menu.contains(e.target) && !btn.contains(e.target)) {
        songPickerOpen = false;
        renderCallSheetView();
      }
    });

    function syncHeaderVisibilityForTab(tabName) {
      const mainHeader = document.getElementById("mainHeader");
      if (mainHeader) {
        mainHeader.classList.toggle("hidden", tabName === "callSheets");
      }
    }

    function applyStageMode() {
      state.stageMode = true;
      document.body.classList.add("stage-mode");
    }

    applyStageMode();
    renderBeatDots();
    switchTab("tracker");
    renderTrackerTable();
    renderCallSheetView();
