const { SlashCommandBuilder } = require('discord.js');
const { ServerQueue } = require('../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stop the music and leave the voice channel'),
  permissions: [],
  async execute(interaction, { queues, player }) {
    console.log('Executing /stop command');
    await interaction.deferReply();
    const guildId = interaction.guildId;

    try {
      const serverQueue = queues.get(guildId);
      if (!serverQueue) {
        return interaction.editReply('❌ No music is currently playing.');
      }

      serverQueue.connection.destroy();
      queues.delete(guildId);
      player.stop();
      await interaction.editReply('🛑 Stopped music and left the voice channel.');
    } catch (error) {
      console.error('Error in /stop command:', error.message);
      await interaction.editReply(`❌ Error: ${error.message}`);
    }
  },
};