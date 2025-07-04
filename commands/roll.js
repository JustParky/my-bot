const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roll')
    .setDescription('Roll up to 5 six-sided dice')
    .addIntegerOption(option =>
      option
        .setName('dice')
        .setDescription('Number of dice to roll (1-5)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(5)
    ),
  permissions: [],
  async execute(interaction) {
    try {
      const numDice = interaction.options.getInteger('dice');
      const rolls = Array.from({ length: numDice }, () => Math.floor(Math.random() * 6) + 1);
      const total = rolls.reduce((sum, roll) => sum + roll, 0);

      // Format the rolls for display
      const rollText = rolls.length === 1 ? `a ${rolls[0]}` : `${rolls.join(', ')} (Total: ${total})`;

      // Random Fallout-themed footer quotes
      const footerQuotes = [
        'Powered by Nexus AI',
        'They see me rollin?',
        'Rollin’ through the Wasteland',
      ];
      const randomFooter = footerQuotes[Math.floor(Math.random() * footerQuotes.length)];

      // Create embed
      const embed = new EmbedBuilder()
        .setTitle('**🎲 *Blows Dice..* You Rolled!**')
        .setDescription(`You rolled ${numDice} six-sided ${numDice === 1 ? 'die' : 'dice'}: **${rollText}**`)
        .setColor(0x00FF00) // Green to match Nexus theme
        .setImage('https://i.postimg.cc/RMfhzsw-R/Chat-GPT-Image-Jul-1-2025-09-01-03-AM.png') // Fallout-themed dice image
        .setFooter({ text: randomFooter, iconURL: interaction.client.user.displayAvatarURL() })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error in /roll command:', error.message);
      await interaction.reply({ 
        content: '❌ Wasteland glitch! Failed to roll the dice. Try again, smoothskin.', 
        flags: 64 
      }).catch(err => {
        console.error('Failed to send error reply:', err.message);
      });
    }
  },
};