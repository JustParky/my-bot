const { SlashCommandBuilder, AudioPlayerStatus } = require('discord.js');
const { ServerQueue } = require('../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pause')
    .setDescription('Pause the current song'),
  permissions: [],
  async execute(interaction, { queues, player }) {
    console.log('Executing /pause command');
    await interaction.deferReply();
    const guildId = interaction.guildId;

    try {
      const serverQueue = queues.get(guildId);
      if (!serverQueue || !serverQueue.currentSong) {
        return interaction.editReply('❌ No music is currently playing.');
      }

      if (player.state.status === AudioPlayerStatus.Playing) {
        player.pause();
        await interaction.editReply('⏸ Paused the current song.');
      } else {
        await interaction.editReply('❌ Music is already paused.');
      }
    } catch (error) {
      console.error('Error in /pause command:', error.message);
      await interaction.editReply(`❌ Error: ${error.message}`);
    }
  },
};