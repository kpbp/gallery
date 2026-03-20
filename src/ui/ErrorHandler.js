/**
 * Error Handler
 * Manages error display and retry functionality
 */
export class ErrorHandler {
  constructor() {
    this.errorMessage = document.getElementById("error-message");
    this.errorText = document.getElementById("error-text");
    this.retryBtn = document.getElementById("retry-btn");

    this.retryCallback = null;

    this.setupEventListeners();
  }

  setupEventListeners() {
    if (this.retryBtn) {
      this.retryBtn.addEventListener("click", () => {
        if (this.retryCallback) {
          this.retryCallback();
        }
      });
    }
  }

  show(message = "An unexpected error occurred") {
    if (this.errorText) {
      this.errorText.textContent = message;
    }

    if (this.errorMessage) {
      this.errorMessage.classList.remove("hidden");
    }
  }

  hide() {
    if (this.errorMessage) {
      this.errorMessage.classList.add("hidden");
    }
  }

  onRetry(callback) {
    this.retryCallback = callback;
  }
}
