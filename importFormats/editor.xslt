<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:out="https://www.scrml.org/content/editor.html">
    <!-- probably going to be abandoned but this stylesheet is intended to take SCRML editor format and convert it to autosave format -->
    <xsl:output method="xml" version="1.0" encoding="UTF-8"/>
    <xsl:template match="/SCRML">
        <xsl:element name="pages">
            <xsl:apply-templates select="//*[@pageType]"/>
        </xsl:element>
    </xsl:template>
    <xsl:template match="*[@pageType]">
        <xsl:copy>
            <xsl:value-of select="@pageType"/>
        </xsl:copy>
    </xsl:template>
</xsl:stylesheet>