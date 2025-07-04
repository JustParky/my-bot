const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

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
    const embed = new EmbedBuilder()
      .setTitle('🎲 Random Number Generator')
      .setDescription(`Your random number is **${num}**!\nRange: ${min} to ${max}`)
      .setColor(0x3498db) // Blue color
      .setTimestamp()
      .setFooter({ text: 'Nexus Random Number' });

    // Add a large image related to randomness (publicly available URL)
    const imageUrl = 'https://i.postimg.cc/wHn2xsFZ/Chat-GPT-Image-Jul-1-2025-08-42-46-AM.png';
    embed.setImage(imageUrl);

    await interaction.reply({ embeds: [embed] });
  },
};