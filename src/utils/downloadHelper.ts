import JSZip from 'jszip';
import { Project } from '../types';
import { getFileFromIndexedDB } from './fileStorage';

/**
 * Universal Mobile & Desktop Download Engine for ORAX PROJET
 * Ensures immediate, unblocked file download across Android, iOS, Windows, macOS and Linux.
 */
export async function triggerProjectDownload(project: Project): Promise<void> {
  const baseName = project.fileName || `${project.name.toLowerCase().replace(/[^a-z0-9]/gi, '_')}.zip`;
  const cleanFileName = baseName.includes('.') ? baseName : `${baseName}.zip`;

  // -------------------------------------------------------------------------
  // 1. Check local IndexedDB storage for original binary file
  // -------------------------------------------------------------------------
  try {
    const idRecord = await getFileFromIndexedDB(project.id);
    if (idRecord && idRecord.data) {
      downloadBlobDirectly(idRecord.data, idRecord.name || cleanFileName);
      return;
    }

    if (project.fileUrl) {
      const urlRecord = await getFileFromIndexedDB(project.fileUrl);
      if (urlRecord && urlRecord.data) {
        downloadBlobDirectly(urlRecord.data, urlRecord.name || cleanFileName);
        return;
      }
    }
  } catch (dbErr) {
    console.warn('IndexedDB retrieval notice:', dbErr);
  }

  // -------------------------------------------------------------------------
  // 2. Handle Data URL (Base64)
  // -------------------------------------------------------------------------
  if (project.fileUrl && project.fileUrl.startsWith('data:')) {
    try {
      const blob = dataUrlToBlob(project.fileUrl);
      downloadBlobDirectly(blob, cleanFileName);
      return;
    } catch (err) {
      console.warn('Data URL parse error:', err);
    }
  }

  // -------------------------------------------------------------------------
  // 3. Handle Remote URLs (Cloudinary, GitHub, CDN, Direct Server Link)
  // -------------------------------------------------------------------------
  if (project.fileUrl && (project.fileUrl.startsWith('http://') || project.fileUrl.startsWith('https://'))) {
    let targetUrl = project.fileUrl;

    // For Cloudinary image attachments (do NOT apply to /raw/ to avoid 400 errors)
    if (targetUrl.includes('cloudinary.com') && targetUrl.includes('/image/upload/') && !targetUrl.includes('fl_attachment')) {
      targetUrl = targetUrl.replace('/image/upload/', `/image/upload/fl_attachment:${encodeURIComponent(cleanFileName)}/`);
    }

    // Trigger immediate native browser download
    triggerDirectUrlDownload(targetUrl, cleanFileName);
    return;
  }

  // -------------------------------------------------------------------------
  // 4. Generate structured fallback ZIP archive with JSZip
  // -------------------------------------------------------------------------
  const zip = new JSZip();

  const readmeContent = `# ${project.name} (v${project.version || '1.0.0'})
Développeur: ${project.developerName || 'ORAX PROJET'}
Catégorie: ${project.category}
Date de téléchargement: ${new Date().toLocaleDateString('fr-FR')}

## Description
${project.description}

## Technologies Utilisées
${(project.technologies || []).map((t) => `- ${t}`).join('\n')}

## Tags
${(project.tags || []).map((t) => `#${t}`).join(' ')}

---
Projet sécurisé et vérifié par ORAX PROJET (LORD DEMON).
`;

  zip.file('README.md', readmeContent);

  const mainDir = zip.folder('src');

  if (project.category === 'bot' || project.category === 'script' || project.category === 'security') {
    mainDir?.file(
      'main.js',
      `// ORAX PROJET - ${project.name}\n// Auteur: ${project.developerName}\n\nconsole.log("Démarrage du projet ${project.name}...");\n\n// Code source principal\n`
    );
    zip.file(
      'package.json',
      JSON.stringify(
        {
          name: project.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          version: project.version || '1.0.0',
          description: project.shortDescription || project.description,
          main: 'src/main.js',
          scripts: {
            start: 'node src/main.js',
          },
          dependencies: {},
        },
        null,
        2
      )
    );
  } else if (project.category === 'mobile') {
    mainDir?.file(
      'main.dart',
      `// ORAX PROJET - ${project.name} Mobile App\n// Développeur: ${project.developerName}\n\nvoid main() {\n  print("${project.name} initialisé avec succès.");\n}\n`
    );
    zip.file('pubspec.yaml', `name: ${project.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}\nversion: ${project.version || '1.0.0'}\ndescription: ${project.description}\n`);
  } else {
    mainDir?.file(
      'index.html',
      `<!DOCTYPE html>\n<html lang="fr">\n<head>\n  <meta charset="UTF-8">\n  <title>${project.name}</title>\n</head>\n<body>\n  <h1>${project.name}</h1>\n  <p>${project.description}</p>\n</body>\n</html>`
    );
    mainDir?.file(
      'styles.css',
      `body {\n  margin: 0;\n  padding: 20px;\n  background-color: #0d1117;\n  color: #c9d1d9;\n  font-family: system-ui, -apple-system, sans-serif;\n}`
    );
    mainDir?.file('app.js', `console.log("${project.name} initialisé.");`);
  }

  zip.file(
    'orax-manifest.json',
    JSON.stringify(
      {
        id: project.id,
        name: project.name,
        version: project.version,
        developer: project.developerName,
        category: project.category,
        technologies: project.technologies,
        createdAt: project.createdAt,
      },
      null,
      2
    )
  );

  const zipBlob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/zip',
    compression: 'DEFLATE',
    compressionOptions: {
      level: 6,
    },
  });

  downloadBlobDirectly(zipBlob, cleanFileName);
}

/**
 * Robust Direct URL Downloader for Remote Files
 * Uses anchor injection with iframe fallback to prevent browser popup blockers.
 */
export function triggerDirectUrlDownload(url: string, fileName: string): void {
  // Method 1: Inject link with download attribute
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.setAttribute('download', fileName);
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';
  anchor.style.position = 'fixed';
  anchor.style.left = '-9999px';
  anchor.style.top = '-9999px';
  anchor.style.width = '1px';
  anchor.style.height = '1px';
  anchor.style.opacity = '0';
  document.body.appendChild(anchor);

  try {
    anchor.click();
  } catch {
    // Method 2: window.open fallback
    try {
      window.open(url, '_blank');
    } catch {
      window.location.href = url;
    }
  }

  // Method 3: Hidden iframe for mobile browsers that ignore anchor clicks on direct download streams
  try {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = url;
    document.body.appendChild(iframe);
    setTimeout(() => {
      try {
        document.body.removeChild(iframe);
      } catch {}
    }, 15000);
  } catch {}

  setTimeout(() => {
    try {
      document.body.removeChild(anchor);
    } catch {}
  }, 10000);
}

/**
 * Triggers native browser file download of a Blob with cross-platform support
 */
export function downloadBlobDirectly(blob: Blob, fileName: string): void {
  const finalBlob = blob.type ? blob : new Blob([blob], { type: 'application/zip' });

  try {
    const blobUrl = window.URL.createObjectURL(finalBlob);
    const anchor = document.createElement('a');
    anchor.href = blobUrl;
    anchor.download = fileName;
    anchor.setAttribute('download', fileName);
    anchor.style.position = 'fixed';
    anchor.style.left = '-9999px';
    anchor.style.top = '-9999px';
    anchor.style.width = '1px';
    anchor.style.height = '1px';
    anchor.style.opacity = '0';
    document.body.appendChild(anchor);

    anchor.click();

    setTimeout(() => {
      try {
        document.body.removeChild(anchor);
        window.URL.revokeObjectURL(blobUrl);
      } catch {}
    }, 45000);
  } catch (err) {
    // Fallback: convert to Base64 Data URL
    try {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const anchor = document.createElement('a');
        anchor.href = dataUrl;
        anchor.download = fileName;
        anchor.setAttribute('download', fileName);
        document.body.appendChild(anchor);
        anchor.click();
        setTimeout(() => {
          try {
            document.body.removeChild(anchor);
          } catch {}
        }, 10000);
      };
      reader.readAsDataURL(finalBlob);
    } catch (readErr) {
      console.error('Download mechanism error:', readErr);
    }
  }
}

function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(';base64,');
  const contentType = parts[0].split(':')[1] || 'application/octet-stream';
  const raw = window.atob(parts[1]);
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);

  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }

  return new Blob([uInt8Array], { type: contentType });
}
