# 📸 Instagram Auto-Posting Feature

This feature automates publishing image posts directly to an Instagram Business profile using the Meta Graph API. It securely loads credentials via environment variables and handles Meta's required two-step container publishing process.

## 🚀 Features
* **Secure Credential Management:** Utilizes `.env` files to keep Meta Access Tokens and Account IDs out of the source code.
* **Two-Step API Pipeline:** Automatically handles container creation and asynchronous publishing.
* **Status Logging:** Provides real-time terminal feedback for container IDs and final Post IDs.

## 📋 Prerequisites
Before running this script, you must have the following:
1. A **Facebook Page** linked to an **Instagram Business Account**.
2. A **Meta Developer App** with the following permissions granted:
   * `instagram_basic`
   * `instagram_content_publish`
   * `pages_show_list`
   * `pages_read_engagement`
3. A valid **Page Access Token** and **Instagram Business Account ID**.

## 🛠️ Setup & Installation

1. **Install required dependencies:**
   ```bash
   pip install requests python-dotenv