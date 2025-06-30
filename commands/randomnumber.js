const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('randomnumber')
    .setDescription('Get a random number')
    .addIntegerOption(option =>
      option.setName('min')
        .setDescription('Minimum (default 1)')
        .setRequired(false))
    .addIntegerOption(option =>
      option.setName('max')
        .setDescription('Maximum (default 100)')
        .setRequired(false)),
  permissions: [],
  async execute(interaction) {
    const min = interaction.options.getInteger('min') || 1;
    const max = interaction.options.getInteger('max') || 100;
    const num = Math.floor(Math.random() * (max - min + 1)) + min;
    await interaction.reply(`🎰 Random number: **${num}**`);
  },
};