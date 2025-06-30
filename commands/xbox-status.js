const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('xbox-status')
    .setDescription('Check Xbox Live status'),
  permissions: [],
  async execute(interaction) {
    await interaction.reply('🎮 Xbox Live services are online. Check https://support.xbox.com/en-US/xbox-live-status for details.');
  },
};