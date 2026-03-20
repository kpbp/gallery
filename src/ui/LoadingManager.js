/**
 * Loading Screen Manager
 * Handles the loading screen display and progress updates
 */
export class LoadingManager {
  constructor() {
    this.loadingScreen = document.getElementById("loading-screen");
    this.progressBar = document.getElementById("loading-progress-bar");
    this.percentageText = document.getElementById("loading-percentage");
    this.loadingText = document.querySelector(".loading-text");

    this.currentProgress = 0;
    this.isVisible = false;

    this.messages = [
      "Loading your photos...",
      "Setting up the gallery...",
      "Preparing the 3D environment...",
      "Almost ready...",
    ];
  }

  show() {
    if (this.loadingScreen) {
      this.loadingScreen.classList.remove("hidden");
      this.isVisible = true;
      this.updateProgress(0);
    }
  }

  hide() {
    if (this.loadingScreen && this.isVisible) {
      // Add a small delay to ensure smooth transition
      setTimeout(() => {
        this.loadingScreen.classList.add("hidden");
        this.isVisible = false;
      }, 500);
    }
  }

  updateProgress(progress) {
    this.currentProgress = Math.max(0, Math.min(100, progress));

    if (this.progressBar) {
      this.progressBar.style.width = `${this.currentProgress}%`;
    }

    if (this.percentageText) {
      this.percentageText.textContent = `${Math.round(this.currentProgress)}%`;
    }

    // Update loading message based on progress
    this.updateMessage();
  }

  updateMessage() {
    if (!this.loadingText) return;

    let messageIndex = 0;
    if (this.currentProgress >= 25) messageIndex = 1;
    if (this.currentProgress >= 50) messageIndex = 2;
    if (this.currentProgress >= 80) messageIndex = 3;

    this.loadingText.textContent = this.messages[messageIndex];
  }

  setCustomMessage(message) {
    if (this.loadingText) {
      this.loadingText.textContent = message;
    }
  }
}
