'use strict';

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['pdf-parse', 'exceljs', 'csv-parse'],
  turbopack: {
    root: __dirname,
  },
};

module.exports = nextConfig;
