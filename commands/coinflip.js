const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('coinflip')
    .setDescription('Flip a coin'),
  permissions: [],
  async execute(interaction) {
    const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
    const embed = new EmbedBuilder()
      .setTitle('🪙 Coin Flip Result')
      .setDescription(`The coin landed on **${result}**!`)
      .setColor(0x3498db) // Blue color
      .setTimestamp()
      .setFooter({ text: 'Nexus Coin Flip' });

    // Add a large image of a coin (publicly available URL)
    const imageUrl = result === 'Heads' ? 'https://i.postimg.cc/hKdbH3cY/Chat-GPT-Image-Jul-2-2025-01-47-13-AM.png' : 'https://i.postimg.cc/hKdbH3cY/Chat-GPT-Image-Jul-2-2025-01-47-13-AM.png';
    embed.setImage(imageUrl);

    await interaction.reply({ embeds: [embed] });
  },
};