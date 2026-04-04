# NewsPulse: RSS Intelligence

NewsPulse is a high-performance, full-stack news aggregation platform that leverages Elasticsearch to provide real-time insights from across the web. It features advanced search capabilities, trending topic analysis, and a responsive, modern UI.

## 🚀 Quick Start

### Prerequisites

- **Node.js**: v18 or higher
- **Elasticsearch**: v8.x instance (local or cloud)
- **npm** or **yarn**

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/newspulse.git
   cd newspulse
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   Create a `.env` file in the root directory (see [Configuration](#-configuration) below).

4. **Start the development server**:
   ```bash
   npm run dev
   ```

5. **Open the app**:
   Navigate to `http://localhost:3000` in your browser.

---

## ⚙️ Configuration

The application requires connection to an Elasticsearch instance. Define the following variables in your `.env` file:

| Variable | Description | Example |
| :--- | :--- | :--- |
| `ELASTICSEARCH_URL` | The endpoint of your Elasticsearch instance | `https://your-es-cluster.com` |
| `ELASTIC_USERNAME` | Elasticsearch username | `elastic` |
| `ELASTIC_PASSWORD` | Elasticsearch password | `your_secure_password` |

*Note: For local development behind a proxy, ensure your `ELASTICSEARCH_URL` is accessible from the server environment.*

---

## 🛠 Technology Stack

### Frontend
- **React 19**: Modern UI library with functional components and hooks.
- **Vite 6**: Lightning-fast build tool and development server.
- **Tailwind CSS 4**: Utility-first CSS framework for rapid UI development.
- **Lucide React**: Clean and consistent icon library.
- **Motion**: Powerful animation engine for smooth transitions.

### Backend
- **Express 4**: Minimalist web framework for Node.js.
- **TypeScript**: Type-safe JavaScript for both client and server.
- **Elasticsearch 8**: Distributed search and analytics engine.
- **tsx**: TypeScript execution engine for development.

---

## 🔍 Features

- **Real-time News Feed**: Fetches and de-duplicates the latest articles from multiple RSS sources.
- **Intelligent Search**: High-relevance full-text search powered by Elasticsearch with **exact phrase boosting** for titles.
- **Interactive News Cards**: Clicking a title or image opens a detailed modal for a deeper dive into the story.
- **Enhanced Detail Popup**: View full descriptions, high-resolution images, and metadata (source and publication date) in a modern modal.
- **Seamless Navigation**: Quick-access external links that automatically close the preview for a smooth browsing experience.
- **Trending Topics**: Automated aggregation of popular tags and keywords.
- **Robust Image Extraction**: Advanced parsing logic to retrieve images from standard and non-standard RSS fields (Media RSS, Enclosures, `image_url`) with elegant fallbacks.
- **Responsive Design**: Optimized for desktop, tablet, and mobile viewing with overflow-safe layouts.

---

## 🛠 Troubleshooting

### Elasticsearch Connection Issues
- **Error: "the client is offline"**: Check if your `ELASTICSEARCH_URL` is correct and reachable. If using a tunnel (like ngrok), ensure the tunnel is active.
- **Authentication Failed**: Verify `ELASTIC_USERNAME` and `ELASTIC_PASSWORD` in your `.env` file.

### Images Not Displaying
- NewsPulse attempts to extract images from several fields. If images are missing, check the raw RSS source to see if they use a custom field not yet supported by the `getImageUrl` helper in `server.ts`.

### Build Errors
- Ensure you are using a compatible Node.js version (v18+).
- Run `npm install` to ensure all peer dependencies are correctly resolved.

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. **Fork the Project**
2. **Create your Feature Branch** (`git checkout -b feature/AmazingFeature`)
3. **Commit your Changes** (`git commit -m 'Add some AmazingFeature'`)
4. **Push to the Branch** (`git push origin feature/AmazingFeature`)
5. **Open a Pull Request**

Please ensure your code adheres to the project's TypeScript and linting standards.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

## ✍️ Author

**Filipe MS Bento**
- [GitHub](https://github.com/fmbento)
- [LinkedIn](https://www.linkedin.com/in/filipebento/)
