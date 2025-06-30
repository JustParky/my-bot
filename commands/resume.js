const { SlashCommandBuilder, AudioPlayerStatus } = require('discord.js');
const { ServerQueue } = require('../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('resume')
    .setDescription('Resume the paused song'),
  permissions: [],
  async execute(interaction, { queues, player }) {
    console.log('Executing /resume command');
    await interaction.deferReply();
    const guildId = interaction.guildId;

    try {
      const serverQueue = queues.get(guildId);
      if (!serverQueue || !serverQueue.currentSong) {
        return interaction.editReply('❌ No music is currently playing.');
      }

      if (player.state.status === AudioPlayerStatus.Paused) {
        player.unpause();
        await interaction.editReply('▶️ Resumed the song.');
      } else {
        await interaction.editReply('❌ Music is not paused.');
      }
    } catch (error) {
      console.error('Error in /resume command:', error.message);
      await interaction.editReply(`❌ Error: ${error.message}`);
    }
  },
};