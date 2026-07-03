"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { SeoFormValues } from "@/lib/seo-form";

interface SeoFieldsCardProps {
  values: SeoFormValues;
  onChange: (values: SeoFormValues) => void;
}

export function SeoFieldsCard({ values, onChange }: SeoFieldsCardProps) {
  const update = (field: keyof SeoFormValues, value: string) => {
    onChange({ ...values, [field]: value });
  };

  return (
    <Card className="py-0 overflow-hidden">
      <Accordion type="single" collapsible className="space-y-0">
        <AccordionItem value="seo" className="border-none">
          <AccordionTrigger className="px-6 py-4 hover:no-underline [&[data-state=open]>svg]:text-foreground">
            <CardHeader className="px-0 py-0 min-w-0 flex-1">
              <CardTitle>SEO & Metadata</CardTitle>
              <CardDescription>
                Optional overrides for search engines and social sharing. Leave
                blank to use auto-generated defaults.
              </CardDescription>
            </CardHeader>
          </AccordionTrigger>
          <AccordionContent>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="seo-title">Meta title</Label>
                  <Input
                    id="seo-title"
                    value={values.title}
                    onChange={(e) => update("title", e.target.value)}
                    className="mt-2"
                    placeholder="Page title for search results"
                  />
                </div>
                <div>
                  <Label htmlFor="seo-canonical">Canonical URL</Label>
                  <Input
                    id="seo-canonical"
                    value={values.canonicalUrl}
                    onChange={(e) => update("canonicalUrl", e.target.value)}
                    className="mt-2"
                    placeholder="https://myanify.vercel.app/artist/example"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="seo-description">Meta description</Label>
                <Textarea
                  id="seo-description"
                  value={values.description}
                  onChange={(e) => update("description", e.target.value)}
                  className="mt-2"
                  rows={3}
                  placeholder="Short description for search engines"
                />
              </div>

              <div>
                <Label htmlFor="seo-keywords">Keywords</Label>
                <Input
                  id="seo-keywords"
                  value={values.keywords}
                  onChange={(e) => update("keywords", e.target.value)}
                  className="mt-2"
                  placeholder="Myanmar music, artist name, streaming"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Comma-separated keywords
                </p>
              </div>

              <div className="border-t border-border pt-4 space-y-4">
                <p className="text-sm font-medium">Open Graph</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="seo-og-title">OG title</Label>
                    <Input
                      id="seo-og-title"
                      value={values.ogTitle}
                      onChange={(e) => update("ogTitle", e.target.value)}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="seo-og-image">OG image URL</Label>
                    <Input
                      id="seo-og-image"
                      value={values.ogImageUrl}
                      onChange={(e) => update("ogImageUrl", e.target.value)}
                      className="mt-2"
                      placeholder="https://..."
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="seo-og-description">OG description</Label>
                  <Textarea
                    id="seo-og-description"
                    value={values.ogDescription}
                    onChange={(e) => update("ogDescription", e.target.value)}
                    className="mt-2"
                    rows={2}
                  />
                </div>
              </div>

              <div className="border-t border-border pt-4 space-y-4">
                <p className="text-sm font-medium">Twitter / X</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="seo-twitter-title">Twitter title</Label>
                    <Input
                      id="seo-twitter-title"
                      value={values.twitterTitle}
                      onChange={(e) => update("twitterTitle", e.target.value)}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="seo-twitter-image">Twitter image URL</Label>
                    <Input
                      id="seo-twitter-image"
                      value={values.twitterImageUrl}
                      onChange={(e) => update("twitterImageUrl", e.target.value)}
                      className="mt-2"
                      placeholder="https://..."
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="seo-twitter-description">
                    Twitter description
                  </Label>
                  <Textarea
                    id="seo-twitter-description"
                    value={values.twitterDescription}
                    onChange={(e) => update("twitterDescription", e.target.value)}
                    className="mt-2"
                    rows={2}
                  />
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <Label htmlFor="seo-schema">Schema markup (JSON-LD)</Label>
                <Textarea
                  id="seo-schema"
                  value={values.schemaMarkup}
                  onChange={(e) => update("schemaMarkup", e.target.value)}
                  className="mt-2 font-mono text-xs"
                  rows={6}
                  placeholder='{"@context":"https://schema.org","@type":"MusicGroup","name":"..."}'
                />
              </div>
            </CardContent>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  );
}
