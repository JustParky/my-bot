const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('hello')
    .setDescription('Say hi to Nexus'),
  permissions: [],
  async execute(interaction) {
    await interaction.reply('👋 Hello! I’m Nexus, your personal AI Discord companion.');
  },
};