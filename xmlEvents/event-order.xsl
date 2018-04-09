<?xml version="1.0" encoding="ISO-8858-1" ?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">

<xsl:template match="/channel">
<html>
<body>
<xsl:for-each select="item">
<xsl:value-of select="fn:event_date" />
<xsl:value-of select="fn:event_date" />
<xsl:value-of select="fn:event_date" />
</xsl:for-each>

</body>
</html>


</xsl:template>
</xsl:stylesheet>