<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:out="https://www.scrml.org/content/editor.html">
    <xsl:output method="xml"/>
    <xsl:variable name="outns" select="'https://www.scrml.org/content/editor.html'"/>
    <xsl:template match="@*|node()">
        <xsl:apply-templates/>
    </xsl:template>
    <xsl:template match="*[namespace-uri()='https://www.scrml.org/content/editor.html']">
        <xsl:copy>
            <xsl:apply-templates/>
        </xsl:copy>
    </xsl:template>
    <xsl:template match="*[@pagenumber!='']">
        <xsl:variable name="pageType" select="@class"/>
        <xsl:variable name="pageName" select="./summary/*[@class='name']/@value"/>
        <xsl:variable name="pageNickname" select="./summary/*[@class='nickname']/@value"/>
        <xsl:element name="{$pageType}" namespace="{$outns}">
            <xsl:attribute name="name"><xsl:value-of select="$pageName"/></xsl:attribute>
            <xsl:if test="$pageNickname != ''">
                <xsl:attribute name="nickname"><xsl:value-of select="$pageNickname"/></xsl:attribute>
            </xsl:if>
            <xsl:for-each select=".">
                <xsl:apply-templates/>
            </xsl:for-each>
        </xsl:element>
    </xsl:template>
</xsl:stylesheet>