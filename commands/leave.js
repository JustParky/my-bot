const { SlashCommandBuilder } = require('discord.js');
const { ServerQueue } = require('../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leave')
    .setDescription('Leave voice channel'),
  permissions: [],
  async execute(interaction, { queues, player }) {
    console.log('Executing /leave command');
    await interaction.deferReply();
    const guildId = interaction.guildId;

    try {
      const serverQueue = queues.get(guildId);
      if (!serverQueue) {
        return interaction.editReply('❌ Not in a voice channel.');
      }

      serverQueue.connection.destroy();
      queues.delete(guildId);
      player.stop();
      await interaction.editReply('👋 Left the voice channel.');
    } catch (error) {
      console.error('Error in /leave command:', error.message);
      await interaction.editReply(`❌ Error: ${error.message}`);
    }
  },
};