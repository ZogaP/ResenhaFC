export const transformMediaLink = (url: string, isEmbed: boolean = false) => {
  if (!url) return '';
  
  // Google Drive
  if (url.includes('drive.google.com')) {
    const fileId = url.match(/\/d\/(.+?)\//)?.[1] || 
                   url.match(/id=(.+?)(&|$)/)?.[1] || 
                   url.match(/\/file\/d\/(.+?)$/)?.[1];
    
    if (fileId) {
      const cleanId = fileId.split('?')[0].split('&')[0];
      if (isEmbed) {
        return `https://drive.google.com/file/d/${cleanId}/preview`;
      }
      return `https://drive.google.com/thumbnail?id=${cleanId}&sz=w1000`;
    }
  }

  // YouTube
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    const videoId = url.match(/(?:v=|\/embed\/|\/11\/|\/v\/|youtu\.be\/|\/watch\?v=|\/watch\?.+&v=)([^#\&\?]*).*/)?.[1];
    if (videoId) return `https://www.youtube.com/embed/${videoId}`;
  }

  return url;
};
