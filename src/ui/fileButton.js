import './styles/file-button.css';

// The button under a letter being read, the same at the desk (prologue.js)
// and in the house (letterArrival.js): in the house's own manner, like the
// prologue's onward card — a thin pale rule round it, matte, a folder drawn
// in a fine line; on hover the rule brightens and the sheet in the folder
// sinks in. Its words change; it stays the same button.
const FOLDER = '<svg class="file-icon" viewBox="0 0 24 18" aria-hidden="true"><path d="M1.5 5.5V16.2H22.5V5.5H11.2L9.4 3.2H1.5Z"/><path d="M6.5 8.2V1.2H17.5V8.2"/><path d="M9 3.8H15M9 5.8H13.5"/></svg>';

/** Makes `button` the file button (its icon and a label span); returns a
 *  function that sets its words. */
export function fileButton(button, label = '') {
  button.classList.add('file-button');
  button.innerHTML = FOLDER;
  const words = document.createElement('span');
  words.className = 'file-label';
  words.textContent = label;
  button.append(words);
  return text => { words.textContent = text; };
}
