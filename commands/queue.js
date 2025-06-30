const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { ServerQueue, splitMessage } = require('../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('Display the current music queue'),
  permissions: [],
  async execute(interaction, { queues, splitMessage }) {
    console.log('Executing /queue command');
    await interaction.deferReply();
    const guildId = interaction.guildId;

    try {
      const serverQueue = queues.get(guildId);
      if (!serverQueue || !serverQueue.songs.length) {
        return interaction.editReply('📭 Queue is empty.');
      }

      const queueList = serverQueue.songs
        .slice(0, 10)
        .map((song, index) => `${index + 1}. **${song.title}** - ${song.requestedBy}`)
        .join('\n');

      const embed = new EmbedBuilder()
        .setTitle('🎶 Music Queue')
        .setDescription(queueList || 'No songs in queue.')
        .setColor(0x1db954)
        .setFooter({ text: `Total songs: ${serverQueue.songs.length}` })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Error in /queue command:', error.message);
      await interaction.editReply(`❌ Error: ${error.message}`);
    }
  },
};