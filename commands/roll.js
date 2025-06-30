const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roll')
    .setDescription('Roll a 6-sided die'),
  permissions: [],
  async execute(interaction) {
    const roll = Math.floor(Math.random() * 6) + 1;
    await interaction.reply(`🎲 You rolled a ${roll}`);
  },
};