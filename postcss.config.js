const path = require('path');

module.exports = {
  plugins: {
    /**
     * For some reason the line below needs to be commented otherwise the npm run complie fails
     */
    tailwindcss: {
      config: path.join(__dirname, 'tailwind.config.js'),
    },
    autoprefixer: {},
  },
};
