const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { ServerQueue } = require('../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('history')
    .setDescription('View recently played songs'),
  permissions: [],
  async execute(interaction, { history }) {
    console.log('Executing /history command');
    await interaction.deferReply(); // Remove ephemeral flag
    const guildId = interaction.guildId;

    try {
      const guildHistory = history.get(guildId) || [];
      if (!guildHistory.length) {
        return interaction.editReply('❌ No songs in history.');
      }

      // Limit to last 5 songs
      const recentSongs = guildHistory.slice(0, 5).map((song, index) => {
        const duration = song.duration ? `${Math.floor(song.duration / 60)}:${(song.duration % 60).toString().padStart(2, '0')}` : 'Unknown';
        return `${index + 1}. **${song.title}** (${duration})\nRequested by: ${song.requestedBy || 'Unknown'} ${song.url ? `\n[Link](${song.url})` : ''}`;
      });

      const embed = new EmbedBuilder()
        .setTitle('🎵 Recently Played Songs')
        .setDescription(recentSongs.join('\n\n') || 'No recent songs to display.')
        .setColor(0x3498db) // Changed to blue
        .setThumbnail('https://i.postimg.cc/y17C26Nd/Chat-GPT-Image-Jul-1-2025-10-41-35-PM.png') // Optional: Add a music-related image
        .addFields({ name: 'Total Songs in History', value: `${guildHistory.length}`, inline: true })
        .setTimestamp()
        .setFooter({ text: 'Nexus Music History' });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Error in /history command:', error.message);
      await interaction.editReply(`❌ Error: ${error.message}`);
    }
  },
};