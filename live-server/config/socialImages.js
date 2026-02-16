/**
 * End-of-Match Social Media Images
 * URLs for displaying results on socials
 */

const SOCIAL_IMAGES = [
  {
    id: 1,
    url: 'https://ibb.co/d4BxbpfR',
    description: 'End of Match Result 1',
  },
  {
    id: 2,
    url: 'https://ibb.co/39pHLtkn',
    description: 'End of Match Result 2',
  },
  {
    id: 3,
    url: 'https://ibb.co/PZzhN2G6',
    description: 'End of Match Result 3',
  },
  {
    id: 4,
    url: 'https://ibb.co/hFj7kj0w',
    description: 'End of Match Result 4',
  },
];

/**
 * Get a random social image
 */
function getRandomSocialImage() {
  return SOCIAL_IMAGES[Math.floor(Math.random() * SOCIAL_IMAGES.length)];
}

/**
 * Get social image by ID
 */
function getSocialImageById(id) {
  return SOCIAL_IMAGES.find((img) => img.id === id);
}

module.exports = {
  SOCIAL_IMAGES,
  getRandomSocialImage,
  getSocialImageById,
};
