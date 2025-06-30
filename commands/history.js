const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { ServerQueue } = require('../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('history')
    .setDescription('View recently played songs'),
  permissions: [],
  async execute(interaction, { history }) {
    console.log('Executing /history command');
    await interaction.deferReply();
    const guildId = interaction.guildId;

    try {
      const guildHistory = history.get(guildId) || [];
      if (!guildHistory.length) {
        return interaction.editReply('❌ No songs in history.');
      }

      const historyList = guildHistory
        .slice(0, 10)
        .map((song, index) => `${index + 1}. **${song.title}** - ${song.requestedBy}`)
        .join('\n');

      const embed = new EmbedBuilder()
        .setTitle('🎶 Song History')
        .setDescription(historyList)
        .setColor(0x1db954)
        .setFooter({ text: `Total songs: ${guildHistory.length}` })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Error in /history command:', error.message);
      await interaction.editReply(`❌ Error: ${error.message}`);
    }
  },
};