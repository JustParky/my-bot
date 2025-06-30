const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check bot latency'),
  permissions: [],
  async execute(interaction, { client }) {
    const latency = Date.now() - interaction.createdTimestamp;
    await interaction.reply({ content: `🏓 Pong! Latency: ${latency}ms, API: ${client.ws.ping}ms`, flags: 64 });
  },
};